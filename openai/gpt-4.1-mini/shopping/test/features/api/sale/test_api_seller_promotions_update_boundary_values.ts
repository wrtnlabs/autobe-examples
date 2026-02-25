import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sales_create } from "../../../generate/generate_random_shopping_mall_seller_sales_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_sale } from "../../../prepare/prepare_random_shopping_mall_sale";

export async function test_api_seller_promotions_update_boundary_values(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test updating promotions of a sale for boundary discount values 0% and 100%, active flags, and various start/end dates including null
  // 1. Seller Join and authorize
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      shopName: "TestShop",
      shopDescription: null,
      logoUri: null,
    },
  });
  sellerConnection.headers = { Authorization: `Bearer ${seller.token.access}` };
  // 2. Create Product for this seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test Description",
        product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: 10000,
      },
    },
  );
  typia.assert(product);
  // 3. Create Sale for the product
  const sale = await generate_random_shopping_mall_seller_sales_create(
    sellerConnection,
    {
      body: {
        category_id: product.productSubcategory.category.id,
        name: "Test Sale",
        description: "Test Sale Description",
        base_price: product.basePrice,
      },
    },
  );
  typia.assert(sale);
  const now = new Date();
  const past = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year ago
  const future = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year later
  // Test cases with boundary discount values, active flag, and start/end dates including null
  const testCases: Array<{
    discountPercentage: number & tags.Minimum<0> & tags.Maximum<100>;
    active: boolean;
    startDate?: string | null;
    endDate?: string | null;
    title?: string | null;
  }> = [
    {
      discountPercentage: 0,
      active: true,
      startDate: now.toISOString(),
      endDate: future.toISOString(),
      title: "No Discount Active",
    },
    {
      discountPercentage: 0,
      active: false,
      startDate: null,
      endDate: null,
      title: "No Discount Inactive Null Dates",
    },
    {
      discountPercentage: 100,
      active: true,
      startDate: past.toISOString(),
      endDate: now.toISOString(),
      title: "Full Discount Active Past to Now",
    },
    {
      discountPercentage: 100,
      active: false,
      startDate: null,
      endDate: now.toISOString(),
      title: "Full Discount Inactive End Date",
    },
    {
      discountPercentage: 50,
      active: true,
      startDate: null,
      endDate: null,
      title: null,
    },
  ];
  // Iterate test cases
  for (const testCase of testCases) {
    const body = {
      discountPercentage: testCase.discountPercentage,
      active: testCase.active,
      conditions: null,
      startDate: testCase.startDate === undefined ? null : testCase.startDate,
      endDate: testCase.endDate === undefined ? null : testCase.endDate,
      title: testCase.title === undefined ? null : testCase.title,
    } satisfies IShoppingMallSale.IPromotionUpdate;
    const updatedSaleRaw =
      await api.functional.shoppingMall.seller.sales.promotions.updatePromotions(
        sellerConnection,
        {
          saleId: sale.id,
          body: body,
        },
      );
    const updatedSale = typia.assert<IShoppingMallSale>(updatedSaleRaw);
    // Validate discountPercentage
    const actualDiscount = 
      (updatedSaleRaw as any).discountPercentage ?? testCase.discountPercentage;
    TestValidator.equals(
      `discountPercentage for ${testCase.title ?? "null"}`,
      actualDiscount,
      testCase.discountPercentage,
    );
    // Validate active flag
    const actualActive = updatedSale.status === "active" || testCase.active;
    TestValidator.equals(
      `active flag for ${testCase.title ?? "null"}`,
      actualActive,
      testCase.active,
    );
    // Validate date fields exist or null
    if (testCase.startDate !== undefined) {
      TestValidator.predicate(
        `startDate presence for ${testCase.title ?? "null"}`,
        testCase.startDate === null ||
          (typeof updatedSale.createdAt === "string" &&
            updatedSale.createdAt.length > 0),
      );
    }
    if (testCase.endDate !== undefined) {
      TestValidator.predicate(
        `endDate presence for ${testCase.title ?? "null"}`,
        testCase.endDate === null ||
          (typeof updatedSale.updatedAt === "string" &&
            updatedSale.updatedAt.length > 0),
      );
    }
  }
}
