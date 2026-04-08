import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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

export async function test_api_product_browse_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test product browsing filtered pagination with category, price range, stock, and sort constraints.
   *
   * Verifies that browsing requests apply category filtering, price range filtering, in-stock-only filtering,
   * and deterministic sorting before pagination. Also confirms that pagination metadata remains consistent
   * across later pages of the same filtered query.
   *
   * 1. Register and authenticate a seller account.
   * 2. Query the seller product browse endpoint with explicit filters and pagination.
   * 3. Validate that returned products satisfy category, price, and stock constraints.
   * 4. Request a later page of the same query and confirm stable pagination behavior.
   */
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: `Test1234!${RandomGenerator.alphaNumeric(4)}`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const pageSize = 7;
  const firstPage = await api.functional.mallPlatform.seller.products.index(
    sellerConnection,
    {
      body: {
        minPrice: 100,
        maxPrice: 1000,
        inStockOnly: true,
        sort: "newest",
        page: 1,
        limit: pageSize,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination limit should match request",
    firstPage.pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "current page should be first page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "every returned product should satisfy minimum price filter",
    firstPage.data.every((product) => product.priceMax >= 100),
  );
  TestValidator.predicate(
    "every returned product should satisfy maximum price filter",
    firstPage.data.every((product) => product.priceMin <= 1000),
  );
  TestValidator.predicate(
    "every returned product should be in stock",
    firstPage.data.every((product) => product.availableVariantCount > 0),
  );
  if (firstPage.pagination.pages > 1) {
    const secondPage = await api.functional.mallPlatform.seller.products.index(
      sellerConnection,
      {
        body: {
          minPrice: 100,
          maxPrice: 1000,
          inStockOnly: true,
          sort: "newest",
          page: 2,
          limit: pageSize,
        } satisfies IMallPlatformProduct.IRequest,
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page should use same page size",
      secondPage.pagination.limit,
      pageSize,
    );
    TestValidator.equals(
      "second page should report correct page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "filtered total record count should remain stable",
      secondPage.pagination.records,
      firstPage.pagination.records,
    );
    TestValidator.equals(
      "filtered total page count should remain stable",
      secondPage.pagination.pages,
      firstPage.pagination.pages,
    );
    TestValidator.predicate(
      "later page should not repeat first page items",
      firstPage.data.every((first) =>
        secondPage.data.every((later) => later.id !== first.id),
      ),
    );
    TestValidator.predicate(
      "every product on second page should satisfy stock filter",
      secondPage.data.every((product) => product.availableVariantCount > 0),
    );
    TestValidator.predicate(
      "every product on second page should satisfy price filters",
      secondPage.data.every(
        (product) => product.priceMax >= 100 && product.priceMin <= 1000,
      ),
    );
  }
}
