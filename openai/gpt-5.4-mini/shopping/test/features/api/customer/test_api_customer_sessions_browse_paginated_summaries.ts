import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Browse paginated customer session summaries with safe fields only.
 *
 * Verifies that an authenticated customer can inspect the session browsing
 * endpoint and receive paginated, non-sensitive summary data. The test checks
 * the page metadata, enforces the expected summary shape, and confirms that
 * the returned records are suitable for inspection without exposing secret or
 * token material.
 *
 * 1. Register and authenticate a customer using the dedicated join utility.
 * 2. Browse the customer session list with explicit pagination and sort
 *    options.
 * 3. Validate the paginated response structure and summary field set.
 * 4. Confirm each record includes a nested customer summary and no token
 *    material.
 */
export async function test_api_customer_sessions_browse_paginated_summaries(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const page = await api.functional.mallPlatform.customer.sessions.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 1,
        sort: "created_at",
        order: "desc",
      } satisfies IMallPlatformCustomerSession.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "pagination current page should be positive",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should match request",
    page.pagination.limit === 1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data should not exceed requested limit",
    page.data.length <= page.pagination.limit,
  );
  for (const summary of page.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "session summary id should be present",
      summary.id.length > 0,
    );
    TestValidator.predicate(
      "session summary ip should be present",
      summary.ip.length > 0,
    );
    TestValidator.predicate(
      "session summary href should be present",
      summary.href.length > 0,
    );
    TestValidator.predicate(
      "session summary referrer should be present",
      summary.referrer.length > 0,
    );
    TestValidator.predicate(
      "session summary customer id should be present",
      summary.customer.id.length > 0,
    );
    TestValidator.equals(
      "session summary customer email should match authenticated customer",
      summary.customer.email,
      customer.email,
    );
    TestValidator.predicate(
      "session summary must not expose tokens",
      !("token" in summary),
    );
  }
}
