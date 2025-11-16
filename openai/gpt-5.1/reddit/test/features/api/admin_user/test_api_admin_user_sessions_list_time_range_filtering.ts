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
 * Validate time-range filtering for admin user session listing.
 *
 * Business goal: Ensure that the admin-only session listing endpoint PATCH
 * /communityPlatform/adminUser/adminUsers/{username}/sessions correctly applies
 * from_created_at and to_created_at filters so that sessions created within a
 * time window are returned and those outside the window are excluded.
 *
 * High-level flow:
 *
 * 1. Register Admin A (actor) via /auth/adminUser/join.
 * 2. Register Admin B (target) via /auth/adminUser/join.
 * 3. Log in as Admin B via /auth/adminUser/login to create at least one session.
 * 4. Switch back to Admin A (by logging in as Admin A) so that listing is done
 *    with a privileged actor.
 * 5. Call the sessions index endpoint for Admin B with a time window that includes
 *    the newly created session and assert that at least one session for Admin B
 *    is returned.
 * 6. Call the same endpoint again with a time window that is safely before the new
 *    session and assert that the data array is empty (or at least does not
 *    contain the previously observed session).
 */
export async function test_api_admin_user_sessions_list_time_range_filtering(
  connection: api.IConnection,
) {
  // Helper to create a join request body
  const createJoinBody = (): ICommunityPlatformAdminUserJoin.IRequest => {
    const username: string = RandomGenerator.alphabets(12);
    const email: string & tags.Format<"email"> = typia.random<
      string & tags.Format<"email">
    >();
    const password: string & tags.Format<"password"> = typia.random<
      string & tags.Format<"password">
    >();

    return {
      username,
      email,
      password,
    } satisfies ICommunityPlatformAdminUserJoin.IRequest;
  };

  // 1. Register Admin A (actor)
  const adminAJoin = createJoinBody();
  const adminA: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoin,
    });
  typia.assert(adminA);

  // 2. Register Admin B (target)
  const adminBJoin = createJoinBody();
  const adminB: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoin,
    });
  typia.assert(adminB);

  // 3. Log in as Admin B to create at least one session.
  const beforeLogin: Date = new Date();

  const adminBLoginBody = {
    identifier: adminBJoin.username,
    password: adminBJoin.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminBAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminBLoginBody,
    });
  typia.assert(adminBAuthorized);

  const afterLogin: Date = new Date();

  // 4. Switch back to Admin A by logging in again using Admin A credentials.
  const adminALoginBody = {
    identifier: adminAJoin.username,
    password: adminAJoin.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminAAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminALoginBody,
    });
  typia.assert(adminAAuthorized);

  // Convert Date to ISO strings for from_created_at and to_created_at
  const inclusiveFrom: string & tags.Format<"date-time"> =
    beforeLogin.toISOString() as string & tags.Format<"date-time">;
  const inclusiveTo: string & tags.Format<"date-time"> =
    afterLogin.toISOString() as string & tags.Format<"date-time">;

  // 5. Call the sessions index endpoint for Admin B with inclusive window.
  const inclusiveRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    from_created_at: inclusiveFrom,
    to_created_at: inclusiveTo,
    ip: null,
  } satisfies ICommunityPlatformAdminuserSession.IRequest;

  const inclusivePage: IPageICommunityPlatformAdminuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.sessions.index(
      connection,
      {
        username: adminB.username,
        body: inclusiveRequestBody,
      },
    );
  typia.assert(inclusivePage);

  // Validate that at least one session is returned and that all
  // sessions belong to Admin B.
  TestValidator.predicate(
    "inclusive time window should return at least one session",
    inclusivePage.data.length > 0,
  );

  await TestValidator.predicate(
    "all returned sessions in inclusive window should belong to Admin B",
    async () => {
      for (const session of inclusivePage.data) {
        typia.assert<ICommunityPlatformAdminuserSession.ISummary>(session);
        if (session.adminUser.id !== adminB.id) return false;
      }
      return true;
    },
  );

  const observedSessionIds: string[] = inclusivePage.data.map(
    (session) => session.id,
  );

  // 6. Call the sessions index endpoint again with a window entirely
  // before the recorded login time of Admin B.
  const pastStart = new Date(beforeLogin.getTime() - 60 * 60 * 1000); // 1 hour before
  const pastEnd = new Date(beforeLogin.getTime() - 30 * 60 * 1000); // 30 minutes before

  const exclusiveFrom: string & tags.Format<"date-time"> =
    pastStart.toISOString() as string & tags.Format<"date-time">;
  const exclusiveTo: string & tags.Format<"date-time"> =
    pastEnd.toISOString() as string & tags.Format<"date-time">;

  const exclusiveRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    from_created_at: exclusiveFrom,
    to_created_at: exclusiveTo,
    ip: null,
  } satisfies ICommunityPlatformAdminuserSession.IRequest;

  const exclusivePage: IPageICommunityPlatformAdminuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.adminUsers.sessions.index(
      connection,
      {
        username: adminB.username,
        body: exclusiveRequestBody,
      },
    );
  typia.assert(exclusivePage);

  // 7. Assert that the previously observed session IDs are not present
  // in the exclusive window result.
  const exclusiveIds = exclusivePage.data.map((session) => session.id);

  const hasOverlap = exclusiveIds.some((id) => observedSessionIds.includes(id));

  TestValidator.predicate(
    "exclusive time window should not include the observed sessions",
    !hasOverlap,
  );
}
