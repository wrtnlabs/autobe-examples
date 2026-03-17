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

export async function test_api_product_update_by_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register a new admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Seller setup - register a new seller
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
  // 3. Seller submits an approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 4. Admin approves the seller's approval request
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
  // 5. Admin creates the first category
  const category1 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Electronics-" + RandomGenerator.alphaNumeric(6),
        description: "Electronic gadgets",
      },
    },
  );
  typia.assert(category1);
  // 6. Admin creates the second category (reassignment target)
  const category2 = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Accessories-" + RandomGenerator.alphaNumeric(6),
        description: "Various accessories",
      },
    },
  );
  typia.assert(category2);
  // The seller needs to re-authenticate after being approved to get fresh session
  // Re-login as seller to refresh session with approval status
  const sellerConnection2: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection2, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 7. Seller creates a product referencing category1
  const originalProduct =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection2,
      {
        body: {
          name: "Original Product Name",
          description: "Original description for the product.",
          base_price: 100,
          categoryId: category1.id,
          variants: [
            {
              sku: "SKU-" + RandomGenerator.alphaNumeric(10),
              priceOverride: null,
              options: [
                {
                  id: typia.random<string & tags.Format<"uuid">>(),
                  product_variant_id: typia.random<
                    string & tags.Format<"uuid">
                  >(),
                  key: "color",
                  value: "red",
                  sequence: 0,
                  created_at: new Date().toISOString(),
                },
              ],
            },
          ],
        },
      },
    );
  typia.assert(originalProduct);
  // TEST EXECUTION: First update - change name, description, base_price, and category to category2
  const updatedName = "Updated Product Name";
  const updatedDescription = "This is the updated product description.";
  const updatedBasePrice = 250;
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerConnection2,
      {
        productId: originalProduct.id,
        body: {
          name: updatedName,
          description: updatedDescription,
          base_price: updatedBasePrice,
          categoryId: category2.id,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Validations for first update
  TestValidator.equals(
    "updated name matches",
    updatedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "updated description matches",
    updatedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated base_price matches",
    updatedProduct.base_price,
    updatedBasePrice,
  );
  // Verify category was reassigned to category2
  TestValidator.predicate(
    "category is not null after reassignment",
    updatedProduct.category !== null,
  );
  TestValidator.equals(
    "category id matches category2",
    updatedProduct.category!.id,
    category2.id,
  );
  // Verify seller info matches
  TestValidator.equals(
    "seller id matches",
    updatedProduct.seller.id,
    originalProduct.seller.id,
  );
  // Verify timestamps: updated_at >= created_at
  TestValidator.predicate(
    "updated_at is not before created_at",
    new Date(updatedProduct.updated_at) >= new Date(updatedProduct.created_at),
  );
  // Verify images and variants arrays are present
  TestValidator.predicate(
    "images array is present",
    Array.isArray(updatedProduct.images),
  );
  TestValidator.predicate(
    "variants array is present",
    Array.isArray(updatedProduct.variants),
  );
  // EDGE CASE: Second update - set categoryId to null to uncategorize the product
  const uncategorizedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerConnection2,
      {
        productId: originalProduct.id,
        body: {
          categoryId: null,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(uncategorizedProduct);
  // Verify category is null after uncategorization
  TestValidator.equals(
    "category is null after uncategorization",
    uncategorizedProduct.category,
    null,
  );
  // Verify other fields remain intact
  TestValidator.equals(
    "name unchanged after uncategorization",
    uncategorizedProduct.name,
    updatedName,
  );
  TestValidator.equals(
    "description unchanged after uncategorization",
    uncategorizedProduct.description,
    updatedDescription,
  );
  TestValidator.equals(
    "base_price unchanged after uncategorization",
    uncategorizedProduct.base_price,
    updatedBasePrice,
  );
}
