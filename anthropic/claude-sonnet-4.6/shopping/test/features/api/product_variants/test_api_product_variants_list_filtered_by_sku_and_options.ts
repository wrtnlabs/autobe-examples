import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
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

export async function test_api_product_variants_list_filtered_by_sku_and_options(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
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
  // 6. Seller re-logs in to get fresh session after approval
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 7. Seller creates a product with 3 distinctly named variants
  const basePrice = 8000;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        categoryId: category.id,
        name: "Test Product for Variant Filtering",
        description: "A product with multiple variants for filter testing",
        base_price: basePrice,
        variants: [
          {
            sku: "VAR-RED-L",
            priceOverride: 10000,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "Red",
                sequence: 0,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "Large",
                sequence: 1,
                created_at: new Date().toISOString(),
              },
            ],
          },
          {
            sku: "VAR-BLUE-S",
            priceOverride: 5000,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "Blue",
                sequence: 0,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "Small",
                sequence: 1,
                created_at: new Date().toISOString(),
              },
            ],
          },
          {
            sku: "VAR-RED-S",
            priceOverride: 7000,
            options: [
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "color",
                value: "Red",
                sequence: 0,
                created_at: new Date().toISOString(),
              },
              {
                id: typia.random<string & tags.Format<"uuid">>(),
                product_variant_id: typia.random<
                  string & tags.Format<"uuid">
                >(),
                key: "size",
                value: "Small",
                sequence: 1,
                created_at: new Date().toISOString(),
              },
            ],
          },
        ],
      },
    },
  );
  typia.assert(product);
  // Test 1: SKU keyword filter = 'RED'
  const skuFilterResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          skuKeyword: "RED",
          sortField: "sku",
          sortOrder: "asc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(skuFilterResult);
  // All returned variants must contain 'RED' in their SKU
  TestValidator.predicate("all SKU-filtered variants contain RED", () =>
    skuFilterResult.data.every((v) => v.sku.includes("RED")),
  );
  // VAR-BLUE-S must not be present
  TestValidator.predicate(
    "VAR-BLUE-S not present in SKU=RED filter",
    () => !skuFilterResult.data.some((v) => v.sku === "VAR-BLUE-S"),
  );
  // Should have 2 results: VAR-RED-L and VAR-RED-S
  TestValidator.equals(
    "SKU filter returns 2 variants",
    skuFilterResult.pagination.records,
    2,
  );
  // Test 2: Option filters = color:Red AND size:Large → only VAR-RED-L
  const optionFilterResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          optionFilters: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          sortField: "sku",
          sortOrder: "asc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(optionFilterResult);
  // Only VAR-RED-L should be returned
  TestValidator.equals(
    "option filter returns 1 variant",
    optionFilterResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "option filter returns VAR-RED-L",
    () =>
      optionFilterResult.data.length === 1 &&
      optionFilterResult.data[0]!.sku === "VAR-RED-L",
  );
  // Test 3: Price range filter — priceMin=6000, priceMax=11000
  // VAR-RED-L (10000) and VAR-RED-S (7000) are in range; VAR-BLUE-S (5000) is excluded
  const priceFilterResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerLoginConnection,
      {
        productId: product.id,
        body: {
          priceMin: 6000,
          priceMax: 11000,
          sortField: "sku",
          sortOrder: "asc",
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(priceFilterResult);
  TestValidator.equals(
    "price filter returns 2 variants",
    priceFilterResult.pagination.records,
    2,
  );
  TestValidator.predicate(
    "price filter does not include VAR-BLUE-S",
    () => !priceFilterResult.data.some((v) => v.sku === "VAR-BLUE-S"),
  );
  // Test 4: Sort by SKU ascending — all 3 variants
  const sortResult = await api.functional.shoppingMall.products.variants.index(
    sellerLoginConnection,
    {
      productId: product.id,
      body: {
        sortField: "sku",
        sortOrder: "asc",
      } satisfies IShoppingMallProductVariant.IRequest,
    },
  );
  typia.assert(sortResult);
  TestValidator.equals(
    "sort result contains all 3 variants",
    sortResult.pagination.records,
    3,
  );
  // Verify ascending order: VAR-BLUE-S < VAR-RED-L < VAR-RED-S
  TestValidator.predicate("variants sorted by SKU ascending", () => {
    const skus = sortResult.data.map((v) => v.sku);
    return (
      skus[0] === "VAR-BLUE-S" &&
      skus[1] === "VAR-RED-L" &&
      skus[2] === "VAR-RED-S"
    );
  });
}
