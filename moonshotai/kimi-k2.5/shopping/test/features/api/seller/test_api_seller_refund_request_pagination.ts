import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refund_request_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/test",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Test page 1 with limit 10
  const limit = 10;
  const page1Response =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate page 1 pagination metadata
  TestValidator.equals(
    "page 1 - current page should be 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 - limit should match",
    page1Response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page 1 - data length should not exceed limit",
    page1Response.data.length <= limit,
  );
  // 3. Test page 2 with limit 10
  const page2Response =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 2,
          limit,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate page 2 pagination metadata
  TestValidator.equals(
    "page 2 - current page should be 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 - limit should match",
    page2Response.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "page 2 - data length should not exceed limit",
    page2Response.data.length <= limit,
  );
  // 4. Verify page 1 and page 2 have different results when both have data
  if (page1Response.data.length > 0 && page2Response.data.length > 0) {
    const page1Ids = page1Response.data.map((item) => item.id);
    const page2Ids = page2Response.data.map((item) => item.id);
    // Check no overlapping IDs between pages
    const hasOverlap = page2Ids.some((id) => page1Ids.includes(id));
    TestValidator.predicate(
      "page 2 should have different items than page 1",
      !hasOverlap,
    );
  }
  // 5. Test with maximum limit value (100)
  const maxLimit = 100;
  const maxLimitResponse =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: maxLimit,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit - limit should match",
    maxLimitResponse.pagination.limit,
    maxLimit,
  );
  TestValidator.predicate(
    "max limit - data length should not exceed max limit",
    maxLimitResponse.data.length <= maxLimit,
  );
  // 6. Test edge case: Request page beyond available data
  const farPage = 999;
  const farPageResponse =
    await api.functional.ecommerceMall.seller.refund_requests.index(
      sellerConnection,
      {
        body: {
          page: farPage,
          limit,
        } satisfies IEcommerceMallRefundRequest.IRequest,
      },
    );
  typia.assert(farPageResponse);
  TestValidator.equals(
    "far page - current page should match requested",
    farPageResponse.pagination.current,
    farPage,
  );
  // When page is beyond available data, either data is empty or pages count is less than requested page
  TestValidator.predicate(
    "far page - should have no data or be beyond total pages",
    farPageResponse.data.length === 0 ||
      farPageResponse.pagination.pages < farPage,
  );
}
