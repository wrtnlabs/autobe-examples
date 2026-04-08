import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_password_reset_unified_browse_default_order(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify unified password reset browsing with default sorting and pagination.
   *
   * This test registers a customer account, authenticates that customer through an isolated connection, and then requests the unified password reset browse endpoint using the default filter values. It validates that the endpoint returns a paginated collection sorted newest-first by created time and that each returned record exposes only safe summary metadata.
   *
   * The verification focuses on default behavior and response-shape safety. It ensures the request can be made from a customer-authenticated session, that mixed account-type reset records are normalized into a single list, and that lifecycle timestamps are available for audit visibility without exposing any reset secret material.
   *
   * 1. Register a customer account to obtain an authenticated session.
   * 2. Call the unified password reset browse endpoint with all filters left at their default null values.
   * 3. Validate pagination metadata and confirm the result set is ordered by newest created time first.
   * 4. Validate that every record contains safe account summary metadata and lifecycle timestamps only.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const output =
    await api.functional.mallPlatform.customer.passwordResets.index(
      customerConnection,
      {
        body: {
          accountType: null,
          accountId: null,
          status: null,
          createdFrom: null,
          createdTo: null,
          expiredFrom: null,
          expiredTo: null,
          sort: null,
          page: null,
          limit: null,
        } satisfies IMallPlatformSellerPasswordReset.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata should be present",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(output.data),
  );
  for (const record of output.data) {
    typia.assert(record);
    TestValidator.predicate(
      "record should expose safe lifecycle metadata",
      record.id.length > 0 &&
        record.createdAt.length > 0 &&
        record.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "record should include a seller account summary when present",
      record.sellerAccount.id.length > 0 &&
        record.sellerAccount.email.length > 0 &&
        typeof record.sellerAccount.status === "string",
    );
  }
  for (let i = 1; i < output.data.length; i++) {
    const previous = Date.parse(output.data[i - 1].createdAt);
    const current = Date.parse(output.data[i].createdAt);
    TestValidator.predicate(
      "results should be ordered newest first by createdAt",
      previous >= current,
    );
  }
}
