import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_detail_full_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `Category-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(category);
  // 3. Register a seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `Shop-${RandomGenerator.alphabets(6)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Submit a seller approval request (seller submits)
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(approvedApproval);
  // 6. Create a product with multiple images and variants
  const productName = `Product-${RandomGenerator.alphabets(8)}`;
  const productDescription = RandomGenerator.paragraph({ sentences: 3 });
  const productBasePrice = 9999;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: productBasePrice,
        categoryId: category.id,
        images: [
          {
            urls: [
              `https://example.com/images/${RandomGenerator.alphabets(10)}.jpg`,
              `https://example.com/images/${RandomGenerator.alphabets(10)}.jpg`,
              `https://example.com/images/${RandomGenerator.alphabets(10)}.jpg`,
            ],
          },
        ],
        variants: [
          {
            sku: `SKU-${RandomGenerator.alphaNumeric(12)}`,
            priceOverride: null,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "Red",
                sequence: 0 as number & tags.Type<"int32">,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "Large",
                sequence: 1 as number & tags.Type<"int32">,
                created_at: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 7. Retrieve the product via public endpoint (no auth)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.shoppingMall.products.at(
    publicConnection,
    { productId: product.id },
  );
  typia.assert(retrieved);
  // 8. Assertions
  // Product ID matches
  TestValidator.equals("product id matches", retrieved.id, product.id);
  // Core fields match
  TestValidator.equals("product name matches", retrieved.name, productName);
  TestValidator.equals(
    "product description matches",
    retrieved.description,
    productDescription,
  );
  TestValidator.equals(
    "product base_price matches",
    retrieved.base_price,
    productBasePrice,
  );
  // Product is active
  TestValidator.equals(
    "product deleted_at is null",
    retrieved.deleted_at,
    null,
  );
  // Category is non-null and correct
  TestValidator.predicate("category is non-null", retrieved.category !== null);
  if (retrieved.category !== null) {
    TestValidator.equals(
      "category id matches",
      retrieved.category.id,
      category.id,
    );
    TestValidator.equals(
      "category name matches",
      retrieved.category.name,
      category.name,
    );
  }
  // Seller info is correct
  TestValidator.predicate(
    "seller id matches",
    retrieved.seller.id === product.seller.id,
  );
  TestValidator.predicate(
    "seller shopName matches",
    retrieved.seller.shopName === product.seller.shopName,
  );
  // Images are ordered by ascending sequence
  TestValidator.predicate(
    "images array has at least 2 entries",
    retrieved.images.length >= 2,
  );
  for (let i = 1; i < retrieved.images.length; i++) {
    TestValidator.predicate(
      `image sequence is ascending at index ${i}`,
      retrieved.images[i]!.sequence >= retrieved.images[i - 1]!.sequence,
    );
  }
  // Variants are present and active
  TestValidator.predicate(
    "variants array is non-empty",
    retrieved.variants.length >= 1,
  );
  for (const variant of retrieved.variants) {
    TestValidator.equals(
      "variant deletedAt is null (active)",
      variant.deletedAt,
      null,
    );
    TestValidator.predicate("variant has sku", variant.sku.length > 0);
  }
}
