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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_variant_detail_with_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category using admin connection
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Clothing-" + RandomGenerator.alphaNumeric(6),
        description: "Clothing category for testing",
      },
    },
  );
  typia.assert(category);
  // 3. Join as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Submit seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Approve the seller using admin credentials
  const updatedApproval =
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
  typia.assert(updatedApproval);
  // 6. Create a product under the approved seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Red Large Shirt",
        description: "A red large shirt for testing",
        base_price: 29.99,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 7. Create a variant with price override and multiple options
  const uniqueSku = `SKU-RED-LARGE-${RandomGenerator.alphaNumeric(8)}`;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: uniqueSku,
          priceOverride: 39.99,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "Red",
              sequence: 0 as number & tags.Type<"int32">,
              created_at: new Date().toISOString(),
            },
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "size",
              value: "Large",
              sequence: 1 as number & tags.Type<"int32">,
              created_at: new Date().toISOString(),
            },
          ] satisfies IShoppingMallProductVariantOption[],
        },
      },
    );
  typia.assert(variant);
  // Test execution: GET variant using PUBLIC connection (no auth)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.shoppingMall.products.variants.at(
    publicConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  typia.assert(retrieved);
  // Validate variant id matches
  TestValidator.equals("variant id matches", retrieved.id, variant.id);
  // Validate SKU matches
  TestValidator.equals("sku matches", retrieved.sku, uniqueSku);
  // Validate priceOverride is 39.99 and not null
  TestValidator.predicate(
    "priceOverride is 39.99",
    retrieved.priceOverride === 39.99,
  );
  // Validate options array contains exactly 2 entries
  TestValidator.equals("options count is 2", retrieved.options.length, 2);
  // Validate options are ordered by sequence ascending
  const sortedOptions = [...retrieved.options].sort(
    (a, b) => a.sequence - b.sequence,
  );
  TestValidator.equals(
    "first option key is color",
    sortedOptions[0]!.key,
    "color",
  );
  TestValidator.equals(
    "first option value is Red",
    sortedOptions[0]!.value,
    "Red",
  );
  TestValidator.equals(
    "first option sequence is 0",
    sortedOptions[0]!.sequence,
    0 as number & tags.Type<"int32">,
  );
  TestValidator.equals(
    "second option key is size",
    sortedOptions[1]!.key,
    "size",
  );
  TestValidator.equals(
    "second option value is Large",
    sortedOptions[1]!.value,
    "Large",
  );
  TestValidator.equals(
    "second option sequence is 1",
    sortedOptions[1]!.sequence,
    1 as number & tags.Type<"int32">,
  );
  // Validate deletedAt is null (variant is active)
  TestValidator.equals("deletedAt is null", retrieved.deletedAt, null);
}
