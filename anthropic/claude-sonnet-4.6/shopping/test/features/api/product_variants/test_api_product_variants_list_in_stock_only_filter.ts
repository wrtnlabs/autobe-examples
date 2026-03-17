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
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_product_variants_list_in_stock_only_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Admin creates a category
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    { body: { name: RandomGenerator.alphabets(8) } },
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
  // 6. Seller creates a product with two variants (VAR-A and VAR-B)
  const skuA = `VAR-A-${RandomGenerator.alphaNumeric(8)}`;
  const skuB = `VAR-B-${RandomGenerator.alphaNumeric(8)}`;
  const variantOptionA = {
    id: typia.random<string & tags.Format<"uuid">>(),
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    key: "color",
    value: "red",
    sequence: 0 as number & tags.Type<"int32">,
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallProductVariantOption;
  const variantOptionB = {
    id: typia.random<string & tags.Format<"uuid">>(),
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    key: "color",
    value: "blue",
    sequence: 0 as number & tags.Type<"int32">,
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } satisfies IShoppingMallProductVariantOption;
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: 5000,
        variants: [
          {
            sku: skuA,
            priceOverride: null,
            options: [variantOptionA],
          } satisfies IShoppingMallProductVariant.ICreate,
          {
            sku: skuB,
            priceOverride: null,
            options: [variantOptionB],
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      },
    },
  );
  typia.assert(product);
  // Find VAR-A and VAR-B from the created product
  const variantA = product.variants.find((v) => v.sku === skuA);
  const variantB = product.variants.find((v) => v.sku === skuB);
  TestValidator.predicate("variantA exists", variantA !== undefined);
  TestValidator.predicate("variantB exists", variantB !== undefined);
  // 7. Seller adds inventory for VAR-A only (quantity=10), VAR-B stays at zero
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        body: {
          quantity: 10 as number & tags.Type<"int32">,
          note: "Initial stock for VAR-A",
        },
        params: {
          productId: product.id,
          variantId: variantA!.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 8. Call with inStockOnly=true — only VAR-A should be returned
  const filteredResult =
    await api.functional.shoppingMall.products.variants.index(
      sellerConnection,
      {
        productId: product.id,
        body: {
          inStockOnly: true,
        } satisfies IShoppingMallProductVariant.IRequest,
      },
    );
  typia.assert(filteredResult);
  // (a) Exactly 1 variant in filtered result
  TestValidator.equals(
    "inStockOnly=true returns exactly 1 variant",
    filteredResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "filtered result has 1 data entry",
    filteredResult.data.length === 1,
  );
  TestValidator.equals(
    "returned variant is VAR-A by SKU",
    filteredResult.data[0].sku,
    skuA,
  );
  // (b) VAR-A has correct stock info
  TestValidator.equals(
    "VAR-A inStock is true",
    filteredResult.data[0].inStock,
    true,
  );
  TestValidator.predicate(
    "VAR-A stockQuantity is 10",
    filteredResult.data[0].stockQuantity === 10,
  );
  // 9. Call with inStockOnly=false — both variants should be returned
  const allResult = await api.functional.shoppingMall.products.variants.index(
    sellerConnection,
    {
      productId: product.id,
      body: {
        inStockOnly: false,
      } satisfies IShoppingMallProductVariant.IRequest,
    },
  );
  typia.assert(allResult);
  // Both variants returned
  TestValidator.equals(
    "inStockOnly=false returns 2 variants",
    allResult.pagination.records,
    2,
  );
  TestValidator.predicate(
    "all result has 2 data entries",
    allResult.data.length === 2,
  );
  const allVarA = allResult.data.find((v) => v.sku === skuA);
  const allVarB = allResult.data.find((v) => v.sku === skuB);
  TestValidator.predicate("VAR-A present in all result", allVarA !== undefined);
  TestValidator.predicate("VAR-B present in all result", allVarB !== undefined);
  // VAR-A: inStock=true, stockQuantity=10
  TestValidator.equals("VAR-A inStock=true (all)", allVarA!.inStock, true);
  TestValidator.predicate(
    "VAR-A stockQuantity=10 (all)",
    allVarA!.stockQuantity === 10,
  );
  // VAR-B: inStock=false, stockQuantity=0
  TestValidator.equals("VAR-B inStock=false (all)", allVarB!.inStock, false);
  TestValidator.predicate(
    "VAR-B stockQuantity=0 (all)",
    allVarB!.stockQuantity === 0,
  );
}
