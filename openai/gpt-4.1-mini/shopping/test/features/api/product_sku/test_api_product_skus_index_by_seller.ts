import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSku";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductApproval";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_product_skus_index_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "TestPassword123!";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Create a product by the seller
  //    Ensure product code and name
  const productCode = RandomGenerator.alphaNumeric(10);
  const productName = RandomGenerator.name(3);
  const productCreateBody = {
    code: productCode,
    name: productName,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product code matches",
    product.code,
    productCode,
  );

  // 3. Retrieve SKUs for the product with pagination, searching and sorting

  // Prepare filter and pagination criteria
  const page = 1 satisfies number & tags.Type<"int32">;
  const limit = 5 satisfies number & tags.Type<"int32">;
  const searchKeyword = productCode.substring(0, 3); // Substring of product code
  const sortField = "price";
  const sortOrderAsc = "asc";
  const sortOrderDesc = "desc";

  // 3.a. Fetch SKUs with paging and search keyword filtering with ascending sort
  const bodyAscending = {
    page: page,
    limit: limit,
    search: searchKeyword,
    sortField: sortField,
    sortOrder: sortOrderAsc,
  } satisfies IShoppingMallProductSku.IRequest;

  const pageResultAsc: IPageIShoppingMallProductSku.ISummary =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productCode: productCode,
      body: bodyAscending,
    });
  typia.assert(pageResultAsc);

  TestValidator.predicate(
    "page result contains SKUs",
    pageResultAsc.data.length > 0,
  );
  TestValidator.equals(
    "pagination current page matches",
    pageResultAsc.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches",
    pageResultAsc.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page result SKUs have matching product ID",
    ArrayUtil.has(pageResultAsc.data, (sku) => sku.id.length > 0),
  );

  // 3.b. Fetch SKUs with descending sort order
  const bodyDescending = {
    page: page,
    limit: limit,
    search: searchKeyword,
    sortField: sortField,
    sortOrder: sortOrderDesc,
  } satisfies IShoppingMallProductSku.IRequest;

  const pageResultDesc =
    await api.functional.shoppingMall.seller.products.skus.index(connection, {
      productCode: productCode,
      body: bodyDescending,
    });
  typia.assert(pageResultDesc);

  TestValidator.predicate(
    "page descending SKUs has data",
    pageResultDesc.data.length > 0,
  );

  // 4. Validate sorting correctness for ascending
  for (let i = 0; i + 1 < pageResultAsc.data.length; i++) {
    TestValidator.predicate(
      `price ascending sort check idx ${i}`,
      pageResultAsc.data[i].price <= pageResultAsc.data[i + 1].price,
    );
  }

  // 5. Validate sorting correctness for descending
  for (let i = 0; i + 1 < pageResultDesc.data.length; i++) {
    TestValidator.predicate(
      `price descending sort check idx ${i}`,
      pageResultDesc.data[i].price >= pageResultDesc.data[i + 1].price,
    );
  }

  // 6. Verify pagination count consistency
  TestValidator.predicate(
    "total pages consistent",
    pageResultAsc.pagination.pages >= 1 &&
      pageResultAsc.pagination.pages >= pageResultAsc.pagination.current,
  );

  // 7. Additional search filter: Check that SKU codes contain the search substring if search keyword provided
  if (searchKeyword.length > 0) {
    for (const sku of pageResultAsc.data) {
      TestValidator.predicate(
        `search keyword contained in sku_code ${sku.sku_code}`,
        sku.sku_code.includes(searchKeyword),
      );
    }
  }
}
