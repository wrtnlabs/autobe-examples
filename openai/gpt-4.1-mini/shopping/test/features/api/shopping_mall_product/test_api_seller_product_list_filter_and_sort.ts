import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_list_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication to get authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(connection, { body: {} });
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuth.token.access}`,
  };
  // 2. Prepare filter values
  const partialName = "pro";
  const productSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  const minPrice = 1000;
  const maxPrice = 10000;
  // 3. Compose filter request interface with expected fields
  interface IProductListRequest extends Partial<Record<string, any>> {
    name?: string;
    product_subcategory_id?: string;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
    page?: number;
    limit?: number;
    sortBy?: "newest" | "priceAsc" | "priceDesc";
  }
  // 4. Base filter request
  const filterRequest: IProductListRequest = {
    name: partialName,
    product_subcategory_id: productSubcategoryId,
    minPrice: minPrice,
    maxPrice: maxPrice,
    inStock: true,
    page: 1,
    limit: 10,
    sortBy: "newest",
  };
  // 5. Request with newest first
  const responseNewest =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: filterRequest,
    });
  typia.assert(responseNewest);
  // 6. Validate that each product matches filter criteria
  responseNewest.data.forEach((productSummary) => {
    const product = productSummary as unknown as Record<string, any>;
    // product.name includes partialName
    TestValidator.predicate(
      `product name includes '${partialName}'`,
      typeof product.name === "string" &&
        product.name.toLowerCase().includes(partialName),
    );
    // product.product_subcategory_id matches
    TestValidator.equals(
      "product subcategory id",
      product.product_subcategory_id,
      productSubcategoryId,
    );
    // product.price >= minPrice
    TestValidator.predicate(
      "product price >= minPrice",
      typeof product.price === "number" && product.price >= minPrice,
    );
    // product.price <= maxPrice
    TestValidator.predicate(
      "product price <= maxPrice",
      typeof product.price === "number" && product.price <= maxPrice,
    );
    // product.inStock is true
    TestValidator.predicate("product in stock", product.inStock === true);
  });
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    responseNewest.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    responseNewest.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    responseNewest.pagination.records >= responseNewest.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    responseNewest.pagination.pages >= 1,
  );
  // 8. Test sorting: price ascending
  const filterRequestPriceAsc = { ...filterRequest, sortBy: "priceAsc" };
  const responsePriceAsc =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: filterRequestPriceAsc,
    });
  typia.assert(responsePriceAsc);
  for (let i = 1; i < responsePriceAsc.data.length; i++) {
    const prev = responsePriceAsc.data[i - 1] as unknown as Record<string, any>;
    const curr = responsePriceAsc.data[i] as unknown as Record<string, any>;
    TestValidator.predicate(
      "price ascending sort order",
      typeof curr.price === "number" &&
        typeof prev.price === "number" &&
        curr.price >= prev.price,
    );
  }
  // 9. Test sorting: price descending
  const filterRequestPriceDesc = { ...filterRequest, sortBy: "priceDesc" };
  const responsePriceDesc =
    await api.functional.shoppingMall.seller.products.index(sellerConnection, {
      body: filterRequestPriceDesc,
    });
  typia.assert(responsePriceDesc);
  for (let i = 1; i < responsePriceDesc.data.length; i++) {
    const prev = responsePriceDesc.data[i - 1] as unknown as Record<
      string,
      any
    >;
    const curr = responsePriceDesc.data[i] as unknown as Record<string, any>;
    TestValidator.predicate(
      "price descending sort order",
      typeof curr.price === "number" &&
        typeof prev.price === "number" &&
        curr.price <= prev.price,
    );
  }
}
