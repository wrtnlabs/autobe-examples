import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPasswordResetToken";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPasswordResetToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_list_password_reset_tokens_for_credentials(
  connection: api.IConnection,
) {
  // 1. Register a platform admin to obtain an authorized session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Trigger a customer password reset request to ensure there is at least
  // one password reset token created in the system. We cannot directly know
  // which authCredentialsId it is associated with, but this ensures the
  // underlying table is populated in realistic usage.
  const resetRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert(resetResult);

  // 3. Call the platform admin password reset token listing endpoint with a
  // syntactically valid authCredentialsId and simple pagination request.
  const authCredentialsId = typia.random<string & tags.Format<"uuid">>();

  const requestBody = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallPasswordResetToken.IRequest;

  const pageResult: IPageIShoppingMallPasswordResetToken.ISummary =
    await api.functional.shoppingMall.platformAdmin.authCredentials.passwordResetTokens.index(
      connection,
      {
        authCredentialsId,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination = pageResult.pagination;

  // 4. Basic pagination invariants
  TestValidator.predicate(
    "pagination.records is non-negative",
    () => pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    () => pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    () => pagination.limit >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals("no pages when no records", pagination.pages, 0);
    TestValidator.equals(
      "current page is 0 when no records",
      pagination.current,
      0,
    );
    TestValidator.equals("no data when no records", pageResult.data.length, 0);
  } else {
    TestValidator.predicate(
      "current page is within range when records exist",
      () =>
        pagination.current >= 0 &&
        pagination.current <= Math.max(0, pagination.pages - 1),
    );
    TestValidator.predicate(
      "data length within limit",
      () => pageResult.data.length <= pagination.limit,
    );
  }

  // 5. Every returned token must belong to the requested authCredentialsId
  for (const summary of pageResult.data) {
    typia.assert<IShoppingMallPasswordResetToken.ISummary>(summary);
    TestValidator.equals(
      "summary.authCredentials.id matches authCredentialsId filter",
      summary.authCredentials.id,
      authCredentialsId,
    );
  }
}
