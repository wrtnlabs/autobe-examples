import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantOption";
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

export async function test_api_product_variant_options_filter_by_key_and_value(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------------------------------------------------
  // 1. Admin setup: join and create a product category
  // -----------------------------------------------------------------------
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Test Category " + RandomGenerator.alphaNumeric(6),
        description: "Category for variant option filter test",
      },
    },
  );
  typia.assert(category);
  // -----------------------------------------------------------------------
  // 2. Seller setup: join, submit approval, admin approves
  // -----------------------------------------------------------------------
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
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
  // -----------------------------------------------------------------------
  // 3. Product creation: approved seller creates a product
  // -----------------------------------------------------------------------
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: "Test Product " + RandomGenerator.alphaNumeric(6),
        description: "Product for variant option filter test",
        base_price: 10000,
      },
    },
  );
  typia.assert(product);
  // -----------------------------------------------------------------------
  // 4. Variant creation: add variant with three option dimensions
  // -----------------------------------------------------------------------
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: "TEST-SKU-" + RandomGenerator.alphaNumeric(10),
          priceOverride: null,
          options: [
            { key: "color", value: "DarkRed", sequence: 0 },
            { key: "size", value: "ExtraLarge", sequence: 1 },
            { key: "material", value: "Cotton", sequence: 2 },
          ],
        },
      },
    );
  typia.assert(variant);
  const productId = product.id;
  const variantId = variant.id;
  // -----------------------------------------------------------------------
  // Test Scenario A: filter by key partial match 'col' => matches 'color'
  // -----------------------------------------------------------------------
  const resultA =
    await api.functional.shoppingMall.products.variants.options.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          key: "col",
        } satisfies IShoppingMallProductVariantOption.IRequest,
      },
    );
  typia.assert(resultA);
  TestValidator.equals(
    "Scenario A: records count should be 1",
    resultA.pagination.records,
    1,
  );
  TestValidator.predicate(
    "Scenario A: returned option key is 'color'",
    resultA.data.length === 1 && resultA.data[0]!.key === "color",
  );
  TestValidator.predicate(
    "Scenario A: 'size' option NOT in result",
    !resultA.data.some((opt) => opt.key === "size"),
  );
  TestValidator.predicate(
    "Scenario A: 'material' option NOT in result",
    !resultA.data.some((opt) => opt.key === "material"),
  );
  // -----------------------------------------------------------------------
  // Test Scenario B: filter by value partial match 'Dark' => matches 'DarkRed'
  // -----------------------------------------------------------------------
  const resultB =
    await api.functional.shoppingMall.products.variants.options.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          value: "Dark",
        } satisfies IShoppingMallProductVariantOption.IRequest,
      },
    );
  typia.assert(resultB);
  TestValidator.equals(
    "Scenario B: records count should be 1",
    resultB.pagination.records,
    1,
  );
  TestValidator.predicate(
    "Scenario B: returned option value is 'DarkRed'",
    resultB.data.length === 1 && resultB.data[0]!.value === "DarkRed",
  );
  // -----------------------------------------------------------------------
  // Test Scenario C: filter by both key 'size' and value 'Extra'
  // -----------------------------------------------------------------------
  const resultC =
    await api.functional.shoppingMall.products.variants.options.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          key: "size",
          value: "Extra",
        } satisfies IShoppingMallProductVariantOption.IRequest,
      },
    );
  typia.assert(resultC);
  TestValidator.equals(
    "Scenario C: records count should be 1",
    resultC.pagination.records,
    1,
  );
  TestValidator.predicate(
    "Scenario C: returned option key is 'size' and value is 'ExtraLarge'",
    resultC.data.length === 1 &&
      resultC.data[0]!.key === "size" &&
      resultC.data[0]!.value === "ExtraLarge",
  );
  // -----------------------------------------------------------------------
  // Test Scenario D: non-matching filter key 'nonexistent_dimension'
  // -----------------------------------------------------------------------
  const resultD =
    await api.functional.shoppingMall.products.variants.options.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          key: "nonexistent_dimension",
        } satisfies IShoppingMallProductVariantOption.IRequest,
      },
    );
  typia.assert(resultD);
  TestValidator.equals(
    "Scenario D: records count should be 0",
    resultD.pagination.records,
    0,
  );
  TestValidator.predicate(
    "Scenario D: data array should be empty",
    resultD.data.length === 0,
  );
  // -----------------------------------------------------------------------
  // Test Scenario E: pagination with limit=2, page=1 (3 total records, 2 pages)
  // -----------------------------------------------------------------------
  const resultE =
    await api.functional.shoppingMall.products.variants.options.index(
      sellerConnection,
      {
        productId,
        variantId,
        body: {
          limit: 2,
          page: 1,
        } satisfies IShoppingMallProductVariantOption.IRequest,
      },
    );
  typia.assert(resultE);
  TestValidator.equals(
    "Scenario E: total records should be 3",
    resultE.pagination.records,
    3,
  );
  TestValidator.equals(
    "Scenario E: total pages should be 2",
    resultE.pagination.pages,
    2,
  );
  TestValidator.predicate(
    "Scenario E: data length should be 2",
    resultE.data.length === 2,
  );
  TestValidator.equals(
    "Scenario E: current page should be 1",
    resultE.pagination.current,
    1,
  );
  TestValidator.equals(
    "Scenario E: limit should be 2",
    resultE.pagination.limit,
    2,
  );
}
