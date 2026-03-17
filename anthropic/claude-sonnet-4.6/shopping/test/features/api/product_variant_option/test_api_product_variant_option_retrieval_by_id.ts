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

export async function test_api_product_variant_option_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin: Join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin: Create a product category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Apparel-" + RandomGenerator.alphaNumeric(6),
        description: "Clothing items",
        parent_id: null,
      },
    },
  );
  typia.assert(category);
  // 3. Seller: Join
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: "Shop-" + RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller: Submit approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin: Approve the seller
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
  // 6. Seller: Create a product with a variant that has specific options (color: Red, size: Large)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "T-Shirt-" + RandomGenerator.alphaNumeric(6),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 29.99,
        categoryId: category.id,
        variants: [
          {
            sku: "SKU-RED-LARGE-" + RandomGenerator.alphaNumeric(8),
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
  // Extract the first variant and its color option
  const firstVariant = product.variants[0];
  typia.assertGuard(firstVariant!);
  const colorOption = firstVariant.options.find((o) => o.key === "color");
  typia.assertGuard(colorOption!);
  const productId = product.id;
  const variantId = firstVariant.id;
  const optionId = colorOption.id;
  // 7. Seller: Add a second variant with different options (color: Blue, size: Small)
  const secondVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId },
        body: {
          sku: "SKU-BLUE-SMALL-" + RandomGenerator.alphaNumeric(8),
          priceOverride: null,
          options: [
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "color",
              value: "Blue",
              sequence: 0 as number & tags.Type<"int32">,
              created_at: new Date().toISOString(),
            },
            {
              id: typia.random<string & tags.Format<"uuid">>(),
              product_variant_id: typia.random<string & tags.Format<"uuid">>(),
              key: "size",
              value: "Small",
              sequence: 1 as number & tags.Type<"int32">,
              created_at: new Date().toISOString(),
            },
          ],
        },
      },
    );
  typia.assert(secondVariant);
  // 8. Public endpoint: Retrieve the specific option (no Authorization needed)
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedOption =
    await api.functional.shoppingMall.products.variants.options.at(
      publicConnection,
      {
        productId,
        variantId,
        optionId,
      },
    );
  typia.assert(retrievedOption);
  // 9. Assertions: Validate business logic correctness
  TestValidator.equals("option id matches", retrievedOption.id, optionId);
  TestValidator.equals(
    "product_variant_id matches",
    retrievedOption.product_variant_id,
    variantId,
  );
  TestValidator.equals("option key is color", retrievedOption.key, "color");
  TestValidator.equals("option value is Red", retrievedOption.value, "Red");
  TestValidator.predicate(
    "sequence is non-negative",
    retrievedOption.sequence >= 0,
  );
}
