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

export async function test_api_admin_login_attempts_search_by_ip_and_user_agent(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser via join to obtain an authorized context.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized = await api.functional.auth.adminUser.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuthorized);

  // 2. Perform multiple login attempts with controlled IP combinations.
  // Focus IP that we will later filter by.
  const focusIp = "192.168.0.10";

  // Noise IP to ensure non-matching records exist.
  const noiseIp = "10.0.0.5";

  const loginHref = "https://admin.example.com/login";
  const loginReferrer = "https://admin.example.com/signin";

  // Capture a time window around the login attempts.
  const occurredFrom = new Date().toISOString();

  // Helper for performing a successful login with given IP.
  const performLogin = async (ip: string): Promise<void> => {
    const loginBody = {
      identifier: adminJoinBody.email,
      password: adminJoinBody.password,
      ip,
      href: loginHref,
      referrer: loginReferrer,
    } satisfies ICommunityPlatformAdminUserLogin.IRequest;

    const loginResult = await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
    typia.assert(loginResult);
  };

  // Two focus attempts
  await performLogin(focusIp);
  await performLogin(focusIp);

  // One noise attempt
  await performLogin(noiseIp);

  const occurredTo = new Date().toISOString();

  // 3. Search login attempts filtered by focus IP within time window.
  const searchBody = {
    identifier: null,
    was_successful: null,
    source_ip: focusIp,
    user_agent: null,
    occurred_from: occurredFrom,
    occurred_to: occurredTo,
    page: 1,
    page_size: 10,
    sort_by: null,
    sort_direction: null,
  } satisfies ICommunityPlatformLoginAttempt.IRequest;

  const page =
    await api.functional.communityPlatform.adminUser.loginAttempts.index(
      connection,
      {
        body: searchBody,
      },
    );
  typia.assert(page);

  // 4. Basic pagination validation.
  TestValidator.equals(
    "login attempts search pagination current page is 1",
    page.pagination.current,
    1,
  );
  TestValidator.predicate(
    "login attempts search page size is not smaller than returned data length",
    page.pagination.limit >= page.data.length,
  );

  // 5. Business validations on IP-based filtering.
  TestValidator.predicate(
    "login attempts search returns at least one record for focus IP",
    page.data.length > 0,
  );

  for (const attempt of page.data) {
    typia.assert(attempt);

    // All attempts must have the specified source_ip.
    TestValidator.equals(
      "each login attempt has the requested source_ip",
      attempt.source_ip,
      focusIp,
    );
  }
}
