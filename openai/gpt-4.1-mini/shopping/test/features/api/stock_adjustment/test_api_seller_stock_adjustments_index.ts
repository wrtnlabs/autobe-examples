import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallStockAdjustment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallStockAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallStockAdjustment";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_seller_stock_adjustments_index(
  connection: api.IConnection,
) {
  // 1. Seller registration (join) and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "P@ssw0rd1234",
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 7,
      wordMin: 4,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(2),
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Create multiple SKU variants for the product
  const skuCount = 3;
  const skuList: IShoppingMallProductSku[] = [];
  for (let i = 0; i < skuCount; i++) {
    const skuCreateBody = {
      sku_code: product.code + "-SKU" + `${i + 1}`,
      price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      attributes_json: JSON.stringify({
        color: RandomGenerator.pick(["red", "green", "blue"] as const),
        size: RandomGenerator.pick(["S", "M", "L"] as const),
      }),
    } satisfies IShoppingMallProductSku.ICreate;
    const sku =
      await api.functional.shoppingMall.seller.products.skus.createSku(
        connection,
        {
          productCode: product.code,
          body: skuCreateBody,
        },
      );
    typia.assert(sku);
    skuList.push(sku);
  }

  // 4. Create user role for seller to enable stock adjustment permissions
  const roleCreateBody = {
    user_id: seller.id,
    role_name: "seller",
  } satisfies IShoppingMallUserRole.ICreate;
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert(userRole);

  // 5. Create stock adjustment records for each SKU
  // This step is simulated as the API to create stock adjustments does not exist
  // Since we only have the stockAdjustments.index PATCH API, we assume some stock adjustments exist
  // To simulate, we could consider the current state ready for listing

  // 6. Test listing stock adjustments with filters, pagination, and sorting
  // Test 1: List all adjustments without filters
  const responseAll: IPageIShoppingMallStockAdjustment.ISummary =
    await api.functional.shoppingMall.seller.stockAdjustments.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallStockAdjustment.IRequest,
      },
    );
  typia.assert(responseAll);
  TestValidator.predicate(
    "response page has data",
    Array.isArray(responseAll.data),
  );

  // Test 2: Filter by actor_type = "seller"
  const responseSeller: IPageIShoppingMallStockAdjustment.ISummary =
    await api.functional.shoppingMall.seller.stockAdjustments.index(
      connection,
      {
        body: {
          actor_type: "seller",
          page: 1,
          limit: 10,
          sort_by: "quantity",
          sort_order: "asc",
        } satisfies IShoppingMallStockAdjustment.IRequest,
      },
    );
  typia.assert(responseSeller);
  for (const entry of responseSeller.data) {
    TestValidator.equals("actor_type is seller", entry.actor_type, "seller");
  }

  // Test 3: Pagination test page 2
  const responsePage2: IPageIShoppingMallStockAdjustment.ISummary =
    await api.functional.shoppingMall.seller.stockAdjustments.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
          sort_by: "adjustment_type",
          sort_order: "desc",
        } satisfies IShoppingMallStockAdjustment.IRequest,
      },
    );
  typia.assert(responsePage2);
  TestValidator.predicate(
    "page number is 2",
    responsePage2.pagination.current === 2,
  );

  // Test 4: Filter by sku_id (choose first SKU), adjustment_type: "addition"
  if (skuList.length > 0) {
    const responseSkuAdd: IPageIShoppingMallStockAdjustment.ISummary =
      await api.functional.shoppingMall.seller.stockAdjustments.index(
        connection,
        {
          body: {
            shopping_mall_product_sku_id: skuList[0].id,
            adjustment_type: "addition",
            page: 1,
            limit: 10,
          } satisfies IShoppingMallStockAdjustment.IRequest,
        },
      );
    typia.assert(responseSkuAdd);
    for (const entry of responseSkuAdd.data) {
      TestValidator.equals(
        "sku_id matches",
        entry.shopping_mall_product_sku_id,
        skuList[0].id,
      );
      TestValidator.equals(
        "adjustment_type is addition",
        entry.adjustment_type,
        "addition",
      );
    }
  }
}
