import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_pagination_behavior(
  connection: api.IConnection,
): Promise<void> {
  // Create a customer connection for session listing
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Create additional sessions by re-authenticating to generate multiple sessions
  const session2Connection: api.IConnection = { host: connection.host };
  await authorize_customer_login(session2Connection, {
    body: {
      email: authorized.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Test 1: Query sessions with limit=10 and page=1
  const page1Response =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          actorType: "customer" as const,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current should be 1",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit should be 10",
    page1Response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "page 1 records count matches data length or less",
    page1Response.data.length <= 10,
  );
  // Store total records for later validation
  const totalRecords = page1Response.pagination.records;
  const totalPages = page1Response.pagination.pages;
  // Test 2: Query page=2 with same limit and verify different results
  let page2Response: IPageIEcommerceMallCustomerSession.ISummary | undefined;
  if (totalPages >= 2) {
    page2Response = await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          actorType: "customer" as const,
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
    typia.assert(page2Response);
    // Validate page 2 metadata
    TestValidator.equals(
      "page 2 current should be 2",
      page2Response.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit should be 10",
      page2Response.pagination.limit,
      10,
    );
    TestValidator.equals(
      "total records should be consistent",
      page2Response.pagination.records,
      totalRecords,
    );
    // Verify different results on page 2
    const page1Ids = page1Response.data.map((s) => s.id);
    const page2Ids = page2Response.data.map((s) => s.id);
    TestValidator.predicate(
      "page 1 and page 2 should have different session IDs",
      page1Ids.some((id) => !page2Ids.includes(id)) ||
        page2Ids.some((id) => !page1Ids.includes(id)),
    );
  }
  // Test 3: Verify limit=100 (maximum) returns up to 100 records
  const maxLimitResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          actorType: "customer" as const,
          limit: 100,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit should be 100",
    maxLimitResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "max limit response data count is valid",
    maxLimitResponse.data.length <= 100,
  );
  // Test 4: Verify default pagination behavior when limit is not specified
  const defaultResponse =
    await api.functional.ecommerceMall.customer.sessions.index(
      customerConnection,
      {
        body: {
          actorType: "customer" as const,
        } satisfies IEcommerceMallCustomerSession.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Default limit should be 20 according to documentation
  TestValidator.equals(
    "default limit should be 20",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  // Test 5: Verify total records count is accurate across pages
  if (totalPages >= 2 && page2Response) {
    const sumOfPageRecords =
      page1Response.data.length + page2Response.data.length;
    TestValidator.predicate(
      "total records should equal sum of page records or indicate more exist",
      totalRecords >= sumOfPageRecords,
    );
  }
  // Validate total records consistency across all queries
  TestValidator.equals(
    "total records consistent in default query",
    defaultResponse.pagination.records,
    totalRecords,
  );
  TestValidator.equals(
    "total records consistent in max limit query",
    maxLimitResponse.pagination.records,
    totalRecords,
  );
}
