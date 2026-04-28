import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer password reset token search endpoint for auditing account security activity.
 *
 * Validates that an authenticated customer can retrieve their password reset token history through a paginated list response. Verifies the endpoint returns proper pagination metadata, password reset records with status indicators (unused or consumed), creation timestamps, and expiration dates. Ensures data isolation by confirming all returned records belong to the requesting customer account.
 *
 * Special attention is given to verifying that results maintain proper sort order by creation time descending and that the pagination structure correctly reflects the total record count and page limits.
 *
 * 1. Register and authenticate a new customer account.
 * 2. Search password reset tokens with default pagination settings.
 * 3. Validate paginated response structure and metadata.
 * 4. Verify data isolation by checking associated customer identity.
 * 5. Confirm results are sorted by creation timestamp descending.
 */
export async function test_api_customer_password_reset_token_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    },
  });
  typia.assert(authorized);
  // 2. Search password reset tokens
  const body = {
    page: 1,
    limit: 20,
  } satisfies IEcommercePlatformCustomerPasswordReset.IRequest;
  const response =
    await api.functional.ecommercePlatform.customer.password_resets.index(
      customerConnection,
      { body },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit matches request", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    () => response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    () => response.pagination.pages >= 0,
  );
  // 4. Validate data isolation - all tokens belong to authenticated customer
  const customerEmail = authorized.email;
  TestValidator.equals(
    "all tokens belong to authenticated customer",
    response.data.map((r) => r.customer.email),
    ArrayUtil.repeat(response.data.length, () => customerEmail),
  );
  // 5. Validate sort order - created_at descending
  if (response.data.length > 1) {
    TestValidator.predicate("results sorted by created_at descending", () => {
      for (let i = 0; i < response.data.length - 1; i++) {
        const current = new Date(response.data[i].created_at).getTime();
        const next = new Date(response.data[i + 1].created_at).getTime();
        if (current < next) {
          return false;
        }
      }
      return true;
    });
  }
  // 6. Validate token records structure
  for (const record of response.data) {
    // Validate token status is one of expected values
    TestValidator.predicate(
      `token status is valid: ${record.status}`,
      () => record.status === "unused" || record.status === "consumed",
    );
    // Validate expired_at is after created_at
    TestValidator.predicate(
      `expired_at after created_at for token ${record.id}`,
      () =>
        new Date(record.expired_at).getTime() >
        new Date(record.created_at).getTime(),
    );
  }
}
