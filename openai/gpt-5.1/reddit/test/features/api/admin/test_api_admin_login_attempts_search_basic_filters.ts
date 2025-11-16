import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformLoginAttempt";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformLoginAttempt";

/**
 * Verify adminUser loginAttempts search with identifier, success-flag and
 * time-range filters.
 *
 * Business goal:
 *
 * - Ensure that an authenticated adminUser can query login attempts via PATCH
 *   /communityPlatform/adminUser/loginAttempts using
 *   ICommunityPlatformLoginAttempt.IRequest filters and receive a properly
 *   paginated list of ICommunityPlatformLoginAttempt.ISummary records.
 * - Validate that basic filters on identifier, was_successful and occurred_at
 *   window are applied, pagination metadata is consistent, and ordering by
 *   occurred_at desc works.
 *
 * Scenario steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join and get an authorized
 *    context.
 * 2. Perform multiple login attempts via POST /auth/adminUser/login using:
 *
 *    - Correct password (to generate successful attempts and keep session).
 *    - Wrong password (to generate failed attempts) for the same identifier.
 *         Optionally, perform some attempts with a different identifier to
 *         ensure filter isolation.
 * 3. Build a time window around now that must include all generated attempts.
 * 4. Call PATCH /communityPlatform/adminUser/loginAttempts with a body that
 *    filters by our identifier, was_successful=false, occurred_from/to bounding
 *    the window, and pagination + sort settings.
 * 5. Assert that the response is typed as
 *    IPageICommunityPlatformLoginAttempt.ISummary and that:
 *
 *    - Pagination.current, .limit, .records, .pages are coherent.
 *    - All data[].identifier equal our chosen identifier.
 *    - All data[].was_successful are false.
 *    - All data[].occurred_at are within the requested time window.
 *    - Data[] is ordered by occurred_at desc.
 */
export async function test_api_admin_login_attempts_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register adminUser (join)
  const username: string = RandomGenerator.alphabets(12);
  const email: string = `${RandomGenerator.alphabets(8)}@example.com`;
  const password: string = "AdminPassword1!";

  const joinBody = {
    username,
    email,
    password: password as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const joined: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2. Generate login attempts
  const identifier: string = username; // use username as login identifier
  const href: string & tags.Format<"uri"> =
    "https://admin.example.com/login" as string & tags.Format<"uri">;
  const referrer: string & tags.Format<"uri"> =
    "https://admin.example.com/" as string & tags.Format<"uri">;

  // capture time window that will contain all attempts
  const startWindow = new Date();

  // 2-1. Successful login
  const loginSuccessBody = {
    identifier,
    password,
    href,
    referrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  const loginAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginSuccessBody,
    });
  typia.assert(loginAuthorized);

  // 2-2. Several failed logins with wrong password
  const failedCount = 3;
  const wrongPassword = `${password}#wrong`;
  for (let i = 0; i < failedCount; i++) {
    const failedBody = {
      identifier,
      password: wrongPassword,
      href,
      referrer,
    } satisfies ICommunityPlatformAdminUserLogin.IRequest;
    await api.functional.auth.adminUser
      .login(connection, {
        body: failedBody,
      })
      .catch(() => {
        // ignore errors; they still should generate login_attempt records
        return;
      });
  }

  // 2-3. Some attempts with a different identifier to ensure filter isolation
  const otherIdentifier = `${username}_other`;
  const otherBody = {
    identifier: otherIdentifier,
    password: wrongPassword,
    href,
    referrer,
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;
  await api.functional.auth.adminUser
    .login(connection, {
      body: otherBody,
    })
    .catch(() => {
      return;
    });

  const endWindow = new Date();

  const occurred_from = new Date(
    startWindow.getTime() - 60 * 1000,
  ).toISOString();
  const occurred_to = new Date(endWindow.getTime() + 60 * 1000).toISOString();

  // 3. Search loginAttempts with filters
  const page = 1;
  const page_size = 10;
  const searchBody = {
    identifier,
    was_successful: false,
    occurred_from,
    occurred_to,
    page,
    page_size,
    sort_by: "occurred_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformLoginAttempt.IRequest;

  const pageResult: IPageICommunityPlatformLoginAttempt.ISummary =
    await api.functional.communityPlatform.adminUser.loginAttempts.index(
      connection,
      { body: searchBody },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 4. Pagination metadata validations
  TestValidator.equals("current page should be 1", pagination.current, page);
  TestValidator.equals(
    "limit should equal requested page_size",
    pagination.limit,
    page_size,
  );
  TestValidator.predicate(
    "records should be at least the number of failed attempts for identifier",
    pagination.records >= 1,
  );
  TestValidator.predicate("pages should be at least 1", pagination.pages >= 1);

  const data: ICommunityPlatformLoginAttempt.ISummary[] = pageResult.data;

  // 5. Validate each record matches filters and time window
  for (const attempt of data) {
    typia.assert(attempt);

    TestValidator.equals(
      "attempt identifier should match filter identifier",
      attempt.identifier,
      identifier,
    );

    TestValidator.equals(
      "was_successful should be false for filtered attempts",
      attempt.was_successful,
      false,
    );

    const occurredAtTime = new Date(attempt.occurred_at).getTime();
    const fromTime = new Date(occurred_from).getTime();
    const toTime = new Date(occurred_to).getTime();

    TestValidator.predicate(
      "attempt.occurred_at should be within requested time window",
      occurredAtTime >= fromTime && occurredAtTime <= toTime,
    );
  }

  // 6. Validate ordering: occurred_at desc
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    const prevTime = new Date(prev.occurred_at).getTime();
    const currTime = new Date(curr.occurred_at).getTime();

    TestValidator.predicate(
      "loginAttempts should be ordered by occurred_at desc",
      prevTime >= currTime,
    );
  }

  // Optional: ensure that unauthenticated access is rejected
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated adminUser cannot access loginAttempts index",
    async () => {
      await api.functional.communityPlatform.adminUser.loginAttempts.index(
        unauthConnection,
        { body: searchBody },
      );
    },
  );
}
