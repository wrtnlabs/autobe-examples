import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_search_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Test search with different status filters
  const statuses = [
    "pending",
    "approved",
    "rejected",
    "auto-approved",
  ] as const;
  for (const status of statuses) {
    // Search for specific status
    const searchResult =
      await api.functional.ecommerce.seller.cancellation_requests.index(
        sellerConnection,
        {
          body: {
            status: status,
            page: 1,
            limit: 10,
          } satisfies IEcommerceCancellationRequest.IRequest,
        },
      );
    typia.assert(searchResult);
    // Verify pagination structure
    TestValidator.equals(
      "pagination structure",
      typeof searchResult.pagination,
      "object",
    );
    TestValidator.predicate(
      "has current page",
      searchResult.pagination.current >= 0,
    );
    TestValidator.predicate("has limit", searchResult.pagination.limit >= 0);
    TestValidator.predicate(
      "has records count",
      searchResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "has pages count",
      searchResult.pagination.pages >= 0,
    );
  }
  // 3. Test text search with trigram matching
  const textSearchResult =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 5,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(textSearchResult);
  // 4. Test empty search (all records)
  const allResults =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(allResults);
  // 5. Test pagination boundaries
  const paginationTest =
    await api.functional.ecommerce.seller.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceCancellationRequest.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Verify that seller information matches authenticated seller
  if (paginationTest.data.length > 0) {
    const firstRequest = paginationTest.data[0];
    TestValidator.equals(
      "seller id matches authenticated seller",
      firstRequest.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "seller email matches",
      firstRequest.seller.email,
      seller.email,
    );
    TestValidator.equals(
      "shop name matches",
      firstRequest.seller.shop_name,
      seller.shop_name,
    );
  }
}
