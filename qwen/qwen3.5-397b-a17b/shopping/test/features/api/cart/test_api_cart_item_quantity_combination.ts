import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_variants_create } from "../../../generate/generate_random_shopping_mall_seller_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test cart item quantity combination when adding the same variant multiple times.
 *
 * Validates that adding the same product variant to the shopping cart multiple times combines quantities rather than creating duplicate cart items. The system enforces a unique constraint on (cart_id, variant_id) and performs an UPDATE operation to add quantities when the variant already exists in the cart.
 *
 * This test ensures the cart maintains data integrity by preventing duplicate entries for the same variant while accurately tracking the total quantity desired by the customer. The updated_at timestamp should reflect the most recent modification.
 *
 * 1. Administrator creates a category for product organization.
 * 2. Seller creates a product under the category.
 * 3. Seller creates a product variant with SKU and option values.
 * 4. Member adds the variant to cart with initial quantity (2).
 * 5. Member adds the same variant again with additional quantity (3).
 * 6. Validates combined quantity equals 5, no duplicate created, and updated_at is newer than created_at.
 */
export async function test_api_cart_item_quantity_combination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const category = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 2. Seller setup - create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates variant
  const variant = await api.functional.shoppingMall.seller.variants.create(
    sellerConnection,
    {
      body: {
        shopping_mall_product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(8).toUpperCase(),
        option_values: `Color: ${RandomGenerator.pick(["Red", "Blue", "Green"] as const)}, Size: ${RandomGenerator.pick(["S", "M", "L"] as const)}`,
        price: null,
      } satisfies IShoppingMallProductVariant.ICreate,
    },
  );
  typia.assert(variant);
  // 4. Member setup - join and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 5. First cart item addition - quantity 2
  const initialQuantity = 2;
  const firstCartItem =
    await api.functional.shoppingMall.member.cart.items.create(
      memberConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: initialQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(firstCartItem);
  // 6. Second cart item addition - same variant, quantity 3
  const additionalQuantity = 3;
  const secondCartItem =
    await api.functional.shoppingMall.member.cart.items.create(
      memberConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: additionalQuantity,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // 7. Validate quantity combination
  const expectedCombinedQuantity = initialQuantity + additionalQuantity;
  TestValidator.equals(
    "combined quantity",
    secondCartItem.quantity,
    expectedCombinedQuantity,
  );
  TestValidator.equals(
    "same cart item ID (no duplicate)",
    secondCartItem.id,
    firstCartItem.id,
  );
  TestValidator.equals(
    "same variant ID",
    secondCartItem.productVariant.id,
    variant.id,
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(secondCartItem.updated_at).getTime() >
      new Date(firstCartItem.created_at).getTime(),
  );
  TestValidator.equals(
    "product variant matches",
    secondCartItem.productVariant.id,
    firstCartItem.productVariant.id,
  );
}
