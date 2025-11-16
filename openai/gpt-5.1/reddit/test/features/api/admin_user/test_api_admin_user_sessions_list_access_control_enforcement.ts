import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdminuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdminuserSession";

/**
 * Verify access control and behavior of admin user session listing.
 *
 * This test ensures that the adminUser session index endpoint
 * `/communityPlatform/adminUser/adminUsers/{username}/sessions`:
 *
 * 1. Rejects unauthenticated requests attempting to list sessions.
 * 2. Allows an authenticated adminUser (AdminA) to list sessions of another
 *    adminUser (AdminB) when calling with AdminB's username and basic
 *    pagination parameters.
 *
 * High-level steps:
 *
 * 1. Prepare deterministic credentials for two admins: AdminA and AdminB.
 * 2. Use a cloned unauthenticated connection to attempt a sessions listing call
 *    and assert that it fails.
 * 3. Register AdminA and AdminB via the adminUser join endpoint.
 * 4. Log in as AdminB to ensure at least one session exists.
 * 5. Log in as AdminA so the shared connection represents AdminA.
 * 6. Call the sessions index endpoint for AdminB's username using AdminA's
 *    authenticated connection, and assert success and basic pagination
 *    behavior.
 */
export async function test_api_admin_user_sessions_list_access_control_enforcement(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic credentials for AdminA and AdminB.
  const adminAPassword = typia.random<string & tags.Format<"password">>();
  const adminBPassword = typia.random<string & tags.Format<"password">>();

  const adminAUsername = RandomGenerator.alphabets(10);
  const adminBUsername = RandomGenerator.alphabets(10);

  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminBEmail = typia.random<string & tags.Format<"email">>();

  const adminAJoinBody = {
    username: adminAUsername,
    email: adminAEmail,
    password: adminAPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminBJoinBody = {
    username: adminBUsername,
    email: adminBEmail,
    password: adminBPassword,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  // 2. Unauthenticated access should fail.
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated adminUser sessions index must fail",
    async () => {
      await api.functional.communityPlatform.adminUser.adminUsers.sessions.index(
        unauthConnection,
        {
          username: adminBUsername,
          body: {
            page: 1 as number & tags.Type<"int32">,
            limit: 5 as number & tags.Type<"int32">,
          } satisfies ICommunityPlatformAdminuserSession.IRequest,
        },
      );
    },
  );

  // 3. Register AdminA and AdminB via join endpoint.
  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  // 4. Log in as AdminB to create at least one session.
  const adminBLoginBody = {
    identifier: adminBUsername,
    password: adminBPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminBAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert(adminBAuthorized);

  // 5. Log in as AdminA so the connection is authenticated as AdminA.
  const adminALoginBody = {
    identifier: adminAUsername,
    password: adminAPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminAAuthorized);

  // 6. Use AdminA's authenticated context to list sessions for AdminB.
  const pageRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformAdminuserSession.IRequest;

  const sessionsPage: IPageICommunityPlatformAdminuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.sessions.index(
      connection,
      {
        username: adminBUsername,
        body: pageRequestBody,
      },
    );

  typia.assert(sessionsPage);

  // Basic behavioral assertions.
  TestValidator.predicate(
    "adminUser sessions listing returns at least one session for admin B",
    sessionsPage.data.length > 0,
  );

  TestValidator.predicate(
    "pagination limit is not less than number of returned sessions",
    sessionsPage.pagination.limit >= sessionsPage.data.length,
  );
}
