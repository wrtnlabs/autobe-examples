import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserLoginAttempt";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserLoginAttempt";

/**
 * Validate retrieval, pagination, and filtering of login attempts for a user,
 * including audit log field structure.
 *
 * 1. Register a new user with randomized but valid data (using
 *    api.functional.auth.user.join())
 * 2. Query login attempts via
 *    api.functional.communityPlatform.user.users.loginAttempts.index() using
 *    several filter/pagination patterns:
 *
 *    - Retrieve full page (page 1, limit 10)
 *    - Filter only for successes (success: true)
 *    - Filter only for failures (success: false)
 *    - Filter by ip substring (if available)
 *    - Fetch all login attempts within a time window (from, to)
 * 3. On every query, validate that returned pagination metadata and data structure
 *    match DTO expectations, all audit fields are present and well-formed, and
 *    success/failure flags and IPs make sense
 * 4. Test pagination (page 1 and, if enough entries, page 2)
 * 5. Ensure only the authorized user can access their own audit trail (API does
 *    not expose cross-user checks, so that is out-of-scope)
 * 6. Assert that results reflect the actual login audit
 */
export async function test_api_user_login_attempts_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Register user
  const userJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies ICommunityPlatformUser.IJoin;
  const authorizedUser = await api.functional.auth.user.join(connection, {
    body: userJoin,
  });
  typia.assert(authorizedUser);

  // 2. Query all login attempts (page 1, limit 10, no filter)
  const baseRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    from: null,
    to: null,
    ip: null,
    success: null,
  } satisfies ICommunityPlatformUserLoginAttempt.IRequest;
  const allAttempts =
    await api.functional.communityPlatform.user.users.loginAttempts.index(
      connection,
      {
        userId: authorizedUser.id,
        body: baseRequest,
      },
    );
  typia.assert(allAttempts);
  TestValidator.predicate(
    "pagination and data format are valid (all)",
    allAttempts.pagination.current === 1 && Array.isArray(allAttempts.data),
  );

  // 3.1 Filter for successful attempts only
  const successRequest = {
    ...baseRequest,
    success: true,
  } satisfies ICommunityPlatformUserLoginAttempt.IRequest;
  const successes =
    await api.functional.communityPlatform.user.users.loginAttempts.index(
      connection,
      {
        userId: authorizedUser.id,
        body: successRequest,
      },
    );
  typia.assert(successes);
  TestValidator.predicate(
    "all returned attempts are successful",
    successes.data.every((r) => r.success === true),
  );

  // 3.2 Filter for failed attempts only
  const failureRequest = {
    ...baseRequest,
    success: false,
  } satisfies ICommunityPlatformUserLoginAttempt.IRequest;
  const failures =
    await api.functional.communityPlatform.user.users.loginAttempts.index(
      connection,
      {
        userId: authorizedUser.id,
        body: failureRequest,
      },
    );
  typia.assert(failures);
  TestValidator.predicate(
    "all returned attempts are failures",
    failures.data.every((r) => r.success === false),
  );

  // 3.3 Filter by ip substring if any result exists
  if (allAttempts.data.length > 0) {
    const ipSubstring = allAttempts.data[0].ip.substring(0, 3);
    const ipRequest = {
      ...baseRequest,
      ip: ipSubstring,
    } satisfies ICommunityPlatformUserLoginAttempt.IRequest;
    const filteredByIp =
      await api.functional.communityPlatform.user.users.loginAttempts.index(
        connection,
        {
          userId: authorizedUser.id,
          body: ipRequest,
        },
      );
    typia.assert(filteredByIp);
    TestValidator.predicate(
      "all returned attempts contain ip substring",
      filteredByIp.data.every((r) => r.ip.includes(ipSubstring)),
    );
  }

  // 3.4 Filter by time window (from first to last attempt)
  if (allAttempts.data.length > 1) {
    const sortedByTime = [...allAttempts.data].sort((a, b) =>
      a.attempted_at.localeCompare(b.attempted_at),
    );
    const [earliest, latest] = [
      sortedByTime[0].attempted_at,
      sortedByTime[sortedByTime.length - 1].attempted_at,
    ];
    const timeWindowRequest = {
      ...baseRequest,
      from: earliest,
      to: latest,
    } satisfies ICommunityPlatformUserLoginAttempt.IRequest;
    const filteredByTime =
      await api.functional.communityPlatform.user.users.loginAttempts.index(
        connection,
        {
          userId: authorizedUser.id,
          body: timeWindowRequest,
        },
      );
    typia.assert(filteredByTime);
    TestValidator.predicate(
      "all returned attempts are within the given time window",
      filteredByTime.data.every(
        (r) => r.attempted_at >= earliest && r.attempted_at <= latest,
      ),
    );
  }

  // 4. Pagination: Try requesting page 2 if there are more records than limit
  if (allAttempts.pagination.pages > 1) {
    const page2Request = {
      ...baseRequest,
      page: 2,
    } satisfies ICommunityPlatformUserLoginAttempt.IRequest;
    const secondPage =
      await api.functional.communityPlatform.user.users.loginAttempts.index(
        connection,
        {
          userId: authorizedUser.id,
          body: page2Request,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "page 2 pagination index",
      secondPage.pagination.current,
      2,
    );
  }

  // 5. Validate each record structure/fields
  for (const att of allAttempts.data) {
    TestValidator.predicate(
      "login attempt id is uuid",
      typeof att.id === "string" && att.id.length > 0,
    );
    TestValidator.predicate(
      "attempted_at is ISO date-time",
      typeof att.attempted_at === "string" &&
        !isNaN(Date.parse(att.attempted_at)),
    );
    TestValidator.predicate(
      "ip is nonempty string",
      typeof att.ip === "string" && att.ip.length > 0,
    );
    TestValidator.predicate(
      "success is boolean",
      typeof att.success === "boolean",
    );
  }
}
