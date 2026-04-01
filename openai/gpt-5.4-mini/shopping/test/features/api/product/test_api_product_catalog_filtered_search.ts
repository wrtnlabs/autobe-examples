import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_catalog_filtered_search(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const authorizedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  const baseRequest = {
    page: 1,
    limit: 20,
    sort: "newest",
  } satisfies IMallPlatformProduct.IRequest;
  const basePage = await api.functional.mallPlatform.seller.products.index(
    authorizedSellerConnection,
    { body: baseRequest },
  );
  typia.assert(basePage);
  TestValidator.equals(
    "base page current",
    basePage.pagination.current,
    baseRequest.page,
  );
  TestValidator.equals(
    "base page limit",
    basePage.pagination.limit,
    baseRequest.limit,
  );
  TestValidator.predicate(
    "base page records non-negative",
    basePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "base page pages non-negative",
    basePage.pagination.pages >= 0,
  );
  TestValidator.predicate("base page data array", Array.isArray(basePage.data));
  const category =
    basePage.data.find((item) => item.category !== null)?.category ?? null;
  const priceProbe = basePage.data.length > 0 ? basePage.data[0].basePrice : 0;
  const bySearch = await api.functional.mallPlatform.seller.products.index(
    authorizedSellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        search: "a",
        sort: "priceAsc",
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(bySearch);
  TestValidator.equals("search page current", bySearch.pagination.current, 1);
  TestValidator.equals("search page limit", bySearch.pagination.limit, 10);
  const byPrice = await api.functional.mallPlatform.seller.products.index(
    authorizedSellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        minPrice: priceProbe,
        maxPrice: priceProbe + 1000000,
        sort: "priceAsc",
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(byPrice);
  TestValidator.equals("price page current", byPrice.pagination.current, 1);
  TestValidator.equals("price page limit", byPrice.pagination.limit, 10);
  for (const item of byPrice.data) {
    TestValidator.predicate(
      "price is within range",
      item.basePrice >= priceProbe && item.basePrice <= priceProbe + 1000000,
    );
  }
  if (category !== null) {
    const byCategory = await api.functional.mallPlatform.seller.products.index(
      authorizedSellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          categoryId: category.id,
          sort: "newest",
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
    typia.assert(byCategory);
    TestValidator.equals(
      "category page current",
      byCategory.pagination.current,
      1,
    );
    TestValidator.equals(
      "category page limit",
      byCategory.pagination.limit,
      10,
    );
    for (const item of byCategory.data) {
      TestValidator.equals(
        "category filter matches",
        item.category?.id,
        category.id,
      );
    }
  }
  const inStockOnly = await api.functional.mallPlatform.seller.products.index(
    authorizedSellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        inStockOnly: true,
        sort: "priceDesc",
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(inStockOnly);
  TestValidator.equals(
    "in-stock page current",
    inStockOnly.pagination.current,
    1,
  );
  TestValidator.equals("in-stock page limit", inStockOnly.pagination.limit, 10);
  const secondPage = await api.functional.mallPlatform.seller.products.index(
    authorizedSellerConnection,
    {
      body: {
        page: 2,
        limit: 5,
        sort: "newest",
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.predicate(
    "pagination metadata is stable",
    basePage.pagination.pages >= 0 && secondPage.pagination.pages >= 0,
  );
}
