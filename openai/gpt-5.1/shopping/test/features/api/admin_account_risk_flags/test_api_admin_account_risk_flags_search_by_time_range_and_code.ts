import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAccountRiskFlag";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_admin_account_risk_flags_search_by_time_range_and_code(
  connection: api.IConnection,
) {
  // 1. Create an admin and obtain authorization context via join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a time window and risk code filter
  // Use a recent 24-hour window around "now" for created_from/created_to.
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const createdFrom = new Date(now.getTime() - oneDayMs).toISOString();
  const createdTo = new Date(now.getTime() + oneDayMs).toISOString();

  const requestedCode = "SUSPICIOUS_LOGIN_PATTERN";

  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    code: requestedCode,
    created_from: createdFrom as string & tags.Format<"date-time">,
    created_to: createdTo as string & tags.Format<"date-time">,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  // 3. Call the search endpoint with code + time-range filters
  const pageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.accountRiskFlags.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(pageResult);

  // 4. Basic pagination validations
  TestValidator.equals(
    "pagination current page equals requested page",
    pageResult.pagination.current,
    requestBody.page,
  );
  TestValidator.equals(
    "pagination limit equals requested limit",
    pageResult.pagination.limit,
    requestBody.limit,
  );

  // 5. Validate each returned risk flag summary respects filters
  for (const flag of pageResult.data) {
    typia.assert<IShoppingMallAccountRiskFlag.ISummary>(flag);

    TestValidator.equals(
      "risk flag code matches requested code",
      flag.code,
      requestedCode,
    );

    // Ensure created_at lies within [created_from, created_to] inclusive.
    TestValidator.predicate(
      "risk flag created_at is within lower bound",
      flag.created_at >= requestBody.created_from!,
    );
    TestValidator.predicate(
      "risk flag created_at is within upper bound",
      flag.created_at <= requestBody.created_to!,
    );
  }

  // 6. Optional: perform another search with a non-overlapping time range and/or different code
  const oldFrom = new Date(now.getTime() - 365 * oneDayMs).toISOString();
  const oldTo = new Date(now.getTime() - 364 * oneDayMs).toISOString();
  const differentCode = "NON_EXISTENT_CODE_FOR_TEST";

  const secondRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
    code: differentCode,
    created_from: oldFrom as string & tags.Format<"date-time">,
    created_to: oldTo as string & tags.Format<"date-time">,
  } satisfies IShoppingMallAccountRiskFlag.IRequest;

  const secondPageResult: IPageIShoppingMallAccountRiskFlag.ISummary =
    await api.functional.shoppingMall.admin.accountRiskFlags.index(connection, {
      body: secondRequestBody,
    });
  typia.assert<IPageIShoppingMallAccountRiskFlag.ISummary>(secondPageResult);

  TestValidator.equals(
    "second search pagination current page equals requested page",
    secondPageResult.pagination.current,
    secondRequestBody.page,
  );

  // All returned items (if any) must match the second filter set
  for (const flag of secondPageResult.data) {
    typia.assert<IShoppingMallAccountRiskFlag.ISummary>(flag);

    TestValidator.equals(
      "second search risk flag code matches different code",
      flag.code,
      differentCode,
    );

    TestValidator.predicate(
      "second search risk flag created_at is within lower bound",
      flag.created_at >= secondRequestBody.created_from!,
    );
    TestValidator.predicate(
      "second search risk flag created_at is within upper bound",
      flag.created_at <= secondRequestBody.created_to!,
    );
  }
}
