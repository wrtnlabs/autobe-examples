import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberuserSession";

/**
 * Admin searches sessions for a restricted member user account.
 *
 * Business goal
 *
 * - Ensure that an authenticated adminUser can:
 *
 *   - Join via /auth/adminUser/join
 *   - Create a generic account restriction episode
 *   - Bind that restriction to a specific member user identified by username
 *   - Search that member user's sessions with time range, status and pagination
 * - Validate that the sessions search endpoint returns a properly typed paginated
 *   response, and that session summaries belong to the target member user and
 *   respect basic filter semantics when data exists.
 *
 * Notes
 *
 * - The available API surface does not let us create member users or force
 *   creation of member sessions, so this test cannot guarantee non-empty
 *   results. It remains valid when the page is empty as long as the response
 *   structure and pagination metadata are correct.
 * - The restriction episode is created generically first and then again via the
 *   memberUsers/{username}/accountRestrictions endpoint, in line with the
 *   available SDK functions.
 */
export async function test_api_admin_memberuser_session_search_for_restricted_account(
  connection: api.IConnection,
) {
  // 1. Admin joins and gets authorized
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a generic restriction episode for memberUser accounts
  const now = new Date();
  const startsAt = now.toISOString();
  const endsAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1h

  const baseRestrictionCreate = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: baseRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(genericRestriction);

  TestValidator.equals(
    "generic restriction account_type should match request",
    genericRestriction.account_type,
    baseRestrictionCreate.account_type,
  );
  TestValidator.equals(
    "generic restriction scope should match request",
    genericRestriction.scope,
    baseRestrictionCreate.scope,
  );
  TestValidator.equals(
    "generic restriction reason_category should match request",
    genericRestriction.reason_category,
    baseRestrictionCreate.reason_category,
  );

  // 3. Link a restriction to a specific member user by username
  const targetUsername: string = "restricted-member";

  const memberRestrictionCreate = {
    account_type: "memberUser",
    scope: "login",
    reason_category: "security",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const memberRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: targetUsername,
        body: memberRestrictionCreate,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(memberRestriction);

  TestValidator.equals(
    "member restriction account_type should be memberUser",
    memberRestriction.account_type,
    "memberUser",
  );

  // 4. Search sessions for the restricted member user
  const fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const toDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const sessionSearchBody = {
    from: fromDate,
    to: toDate,
    ip: null,
    href: null,
    referrer: null,
    status: "active",
    page,
    limit,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies ICommunityPlatformMemberuserSession.IRequest;

  const pageResult: IPageICommunityPlatformMemberuserSession.ISummary =
    await api.functional.communityPlatform.adminUser.memberUsers.sessions.index(
      connection,
      {
        username: targetUsername,
        body: sessionSearchBody,
      },
    );
  typia.assert<IPageICommunityPlatformMemberuserSession.ISummary>(pageResult);

  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current should equal requested page",
    pageResult.pagination.current,
    sessionSearchBody.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    pageResult.pagination.limit,
    sessionSearchBody.limit ?? pageResult.pagination.limit,
  );

  // 6. Validate session records, if any
  for (const session of pageResult.data) {
    typia.assert<ICommunityPlatformMemberuserSession.ISummary>(session);

    // memberUser username must match the target username
    TestValidator.equals(
      "session memberUser.username should match target username",
      session.memberUser.username,
      targetUsername,
    );

    // When status filter is "active", expired_at should be null (or undefined)
    TestValidator.predicate(
      "active session should not have expired_at",
      session.expired_at === null || session.expired_at === undefined,
    );

    // created_at should be within the requested window
    const createdAtTime = new Date(session.created_at).getTime();
    const fromTime = new Date(sessionSearchBody.from ?? fromDate).getTime();
    const toTime = new Date(sessionSearchBody.to ?? toDate).getTime();

    TestValidator.predicate(
      "session created_at should be on or after from",
      createdAtTime >= fromTime,
    );
    TestValidator.predicate(
      "session created_at should be on or before to",
      createdAtTime <= toTime,
    );
  }
}
