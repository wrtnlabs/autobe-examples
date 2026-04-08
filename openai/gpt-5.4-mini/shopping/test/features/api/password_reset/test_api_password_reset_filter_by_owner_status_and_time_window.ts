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

export async function test_api_password_reset_filter_by_owner_status_and_time_window(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify password reset filtering by owner, status, and time windows.
   *
   * This test authenticates a customer account and exercises the password reset search
   * endpoint with owner, lifecycle, and time-window filters. It validates that the
   * endpoint returns paginated safe summary data, preserves inclusive date boundaries,
   * and keeps records scoped to the requested account context.
   *
   * 1. Register a customer and obtain an authenticated session for the search request.
   * 2. Query password reset records with customer owner and date-bound filters.
   * 3. Validate pagination metadata and verify the returned records match the request scope.
   * 4. Confirm created and expired timestamps remain within the requested inclusive range.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const now: Date = new Date();
  const createdFromDate: Date = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 30,
  );
  const createdToDate: Date = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 30,
  );
  const expiredFromDate: Date = new Date(
    now.getTime() - 1000 * 60 * 60 * 24 * 7,
  );
  const expiredToDate: Date = new Date(
    now.getTime() + 1000 * 60 * 60 * 24 * 60,
  );
  const output =
    await api.functional.mallPlatform.customer.passwordResets.index(
      customerConnection,
      {
        body: {
          accountType: "customer",
          accountId: authorized.id,
          status: null,
          createdFrom: createdFromDate.toISOString(),
          createdTo: createdToDate.toISOString(),
          expiredFrom: expiredFromDate.toISOString(),
          expiredTo: expiredToDate.toISOString(),
          sort: null,
          page: 1,
          limit: 20,
        } satisfies IMallPlatformSellerPasswordReset.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page should be positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "results should stay within the requested customer scope when present",
    () =>
      output.data.every((record) => record.sellerAccount.id === authorized.id),
  );
  TestValidator.predicate(
    "createdAt values should stay within the requested inclusive window",
    () =>
      output.data.every((record) => {
        const createdAt: number = new Date(record.createdAt).getTime();
        return (
          createdAt >= createdFromDate.getTime() &&
          createdAt <= createdToDate.getTime()
        );
      }),
  );
  TestValidator.predicate(
    "expiredAt values should stay within the requested inclusive window when present",
    () =>
      output.data.every((record) => {
        if (record.expiredAt === null) return true;
        const expiredAt: number = new Date(record.expiredAt).getTime();
        return (
          expiredAt >= expiredFromDate.getTime() &&
          expiredAt <= expiredToDate.getTime()
        );
      }),
  );
}
