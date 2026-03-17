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

export async function test_api_product_creation_by_approved_seller_with_full_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a product category using the admin connection
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: `Test Category ${RandomGenerator.alphaNumeric(8)}`,
        description: "A test category for product creation",
      },
    },
  );
  typia.assert(category);
  // 3. Register and authenticate as seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: `Test Shop ${RandomGenerator.alphaNumeric(6)}`,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    {},
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
  TestValidator.equals(
    "approval status is approved",
    approvedApproval.status,
    "approved",
  );
  // 6. Seller creates a fully-detailed product
  const sku1 = `SKU-${RandomGenerator.alphaNumeric(12)}`;
  const sku2 = `SKU-${RandomGenerator.alphaNumeric(12)}`;
  const productName = "Ergonomic Office Chair";
  const productDescription =
    "A premium ergonomic office chair designed for maximum comfort during long work sessions. Features lumbar support, adjustable armrests, and breathable mesh back.";
  const basePrice = 299.99;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: productName,
        description: productDescription,
        base_price: basePrice,
        categoryId: category.id,
        images: [
          {
            urls: [
              typia.random<string & tags.Format<"url">>(),
              typia.random<string & tags.Format<"url">>(),
            ],
          },
        ],
        variants: [
          {
            sku: sku1,
            priceOverride: 289.99,
            options: [
              {
                ...typia.random<IShoppingMallProductVariantOption>(),
                key: "color",
                value: "Black",
              },
              {
                ...typia.random<IShoppingMallProductVariantOption>(),
                key: "size",
                value: "Large",
              },
            ],
          },
          {
            sku: sku2,
            priceOverride: 319.99,
            options: [
              {
                ...typia.random<IShoppingMallProductVariantOption>(),
                key: "color",
                value: "White",
              },
              {
                ...typia.random<IShoppingMallProductVariantOption>(),
                key: "size",
                value: "Medium",
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // Assertions: business logic validation
  TestValidator.equals("product name matches", product.name, productName);
  TestValidator.equals(
    "product description matches",
    product.description,
    productDescription,
  );
  TestValidator.equals(
    "product base_price matches",
    product.base_price,
    basePrice,
  );
  TestValidator.predicate(
    "seller id matches",
    product.seller.id === sellerAuth.id,
  );
  TestValidator.predicate(
    "category id matches",
    product.category !== null && product.category.id === category.id,
  );
  TestValidator.equals("images count is 2", product.images.length, 2);
  TestValidator.equals("variants count is 2", product.variants.length, 2);
  TestValidator.equals("product is not deleted", product.deleted_at, null);
  // Validate variant SKUs are present in the response
  const variantSkus = product.variants.map((v) => v.sku);
  TestValidator.predicate(
    "first variant sku matches",
    variantSkus.includes(sku1),
  );
  TestValidator.predicate(
    "second variant sku matches",
    variantSkus.includes(sku2),
  );
  // Validate each variant has options populated
  for (const variant of product.variants) {
    TestValidator.predicate("variant has options", variant.options.length >= 1);
  }
}
