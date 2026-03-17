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

export async function test_api_product_variant_detail_without_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and gets authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoined = await authorize_admin_join(adminConnection, {});
  typia.assert(adminJoined);
  // 2. Create category using admin connection
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: { name: "Electronics" },
    },
  );
  typia.assert(category);
  // 3. Seller joins and gets authenticated connection
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller (adminConnection is already authenticated from join)
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
  TestValidator.equals(
    "approval status is approved",
    approvedApproval.status,
    "approved",
  );
  // 6. Seller re-logs in to get a fresh seller-authenticated connection
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerAuthConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 7. Create a product with base_price=99.99 under the created category
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAuthConnection,
    {
      body: {
        name: "Test Product for Variant No Price Override",
        description:
          "A product to test variant retrieval without price override",
        base_price: 99.99,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  TestValidator.equals("product base_price", product.base_price, 99.99);
  // 8. Create a variant with no priceOverride and two options (color:Blue, size:Small)
  const variantSku = `SKU-BLUE-SMALL-NOP-${RandomGenerator.alphaNumeric(8)}`;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAuthConnection,
      {
        params: { productId: product.id },
        body: {
          sku: variantSku,
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
  typia.assert(variant);
  // 9. Anonymous GET call to retrieve the variant (no auth required)
  const anonymousConnection: api.IConnection = { host: connection.host };
  const fetchedVariant = await api.functional.shoppingMall.products.variants.at(
    anonymousConnection,
    {
      productId: product.id,
      variantId: variant.id,
    },
  );
  typia.assert(fetchedVariant);
  // Validations
  TestValidator.equals(
    "variant id matches created variant",
    fetchedVariant.id,
    variant.id,
  );
  TestValidator.equals("variant sku matches", fetchedVariant.sku, variantSku);
  TestValidator.equals(
    "priceOverride is null (inherits base_price)",
    fetchedVariant.priceOverride,
    null,
  );
  TestValidator.equals(
    "variant is active (deletedAt is null)",
    fetchedVariant.deletedAt,
    null,
  );
  TestValidator.equals("options count is 2", fetchedVariant.options.length, 2);
  // Validate option ordering: color first (sequence 0), then size (sequence 1)
  const colorOption = fetchedVariant.options[0];
  const sizeOption = fetchedVariant.options[1];
  TestValidator.predicate(
    "first option key is color",
    colorOption !== undefined && colorOption.key === "color",
  );
  TestValidator.predicate(
    "first option value is Blue",
    colorOption !== undefined && colorOption.value === "Blue",
  );
  TestValidator.predicate(
    "first option sequence is 0",
    colorOption !== undefined && colorOption.sequence === 0,
  );
  TestValidator.predicate(
    "second option key is size",
    sizeOption !== undefined && sizeOption.key === "size",
  );
  TestValidator.predicate(
    "second option value is Small",
    sizeOption !== undefined && sizeOption.value === "Small",
  );
  TestValidator.predicate(
    "second option sequence is 1",
    sizeOption !== undefined && sizeOption.sequence === 1,
  );
}
