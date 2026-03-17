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
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_variant_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Step 2: Create a product category using admin connection
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: "Test Category " + RandomGenerator.alphaNumeric(6) } },
  );
  typia.assert(category);
  // Step 3: Register seller
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
  // Step 4: Submit seller approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // Step 5: Admin approves the seller
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
  // Step 6: Create a product under the approved seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product " + RandomGenerator.alphaNumeric(6),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 19.99,
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // Step 7: Create an initial variant with SKU-INIT-001
  const initialVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: "SKU-INIT-001-" + RandomGenerator.alphaNumeric(6),
          priceOverride: 15.5,
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Small" },
          ],
        },
      },
    );
  typia.assert(initialVariant);
  // Test execution: Update the variant
  const updatedSku = "SKU-UPDATED-001-" + RandomGenerator.alphaNumeric(6);
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: {
          sku: updatedSku,
          priceOverride: 25.99,
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Large" },
            { key: "material", value: "Cotton" },
          ],
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Validation 1: New SKU is reflected
  TestValidator.equals("updated SKU matches", updatedVariant.sku, updatedSku);
  // Validation 2: New price override is reflected
  TestValidator.equals(
    "updated priceOverride matches",
    updatedVariant.priceOverride,
    25.99,
  );
  // Validation 3: Options array has exactly 3 entries (full replacement)
  TestValidator.equals("options count is 3", updatedVariant.options.length, 3);
  // Validation 4: Old options 'Red' and 'Small' are no longer present
  const optionValues = updatedVariant.options.map((o) => o.value);
  TestValidator.predicate(
    "old option Red is removed",
    !optionValues.includes("Red"),
  );
  TestValidator.predicate(
    "old option Small is removed",
    !optionValues.includes("Small"),
  );
  // Validation 5: New options Blue, Large, Cotton are present
  TestValidator.predicate(
    "new option Blue is present",
    optionValues.includes("Blue"),
  );
  TestValidator.predicate(
    "new option Large is present",
    optionValues.includes("Large"),
  );
  TestValidator.predicate(
    "new option Cotton is present",
    optionValues.includes("Cotton"),
  );
  // Validation 6: updatedAt > createdAt (timestamp advances)
  TestValidator.predicate(
    "updatedAt is after or equal to createdAt",
    new Date(updatedVariant.updatedAt) >= new Date(updatedVariant.createdAt),
  );
  // Validation 7: deletedAt remains null
  TestValidator.equals("deletedAt is null", updatedVariant.deletedAt, null);
}
