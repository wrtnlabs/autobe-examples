import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModeratorAssignment";

/**
 * Validate that a platform admin can list moderator assignments for a
 * community.
 *
 * Business flow:
 *
 * 1. Register and authenticate a platform admin.
 * 2. As platform admin, create an account status and a community visibility level.
 * 3. Register and authenticate a member user.
 * 4. As member user, create a community using the visibility level.
 * 5. Re-authenticate as platform admin and create a moderator assignment for that
 *    community.
 * 6. As platform admin, call the moderatorAssignments.index endpoint with
 *    activeOnly=true and basic pagination (page=1, pageSize>0).
 * 7. Assert that the response contains at least one assignment for the created
 *    community, that all items are active, and that pagination metadata is
 *    consistent.
 */
export async function test_api_platform_admin_lists_moderator_assignments_for_community(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) and gets authorized
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedFromJoin);

  // 2. Create an account status suitable for admins/moderators
  const accountStatusCreateBody = {
    key: `ACTIVE_${RandomGenerator.alphabets(5)}`,
    label: "Active Account",
    description: "Active status for platform admins and moderators",
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdAccountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(createdAccountStatus);

  // 3. Create a community visibility level master record
  const visibilityLevelCode = `public_${RandomGenerator.alphabets(5)}`;
  const visibilityLevelCreateBody = {
    code: visibilityLevelCode,
    name: "Public Visibility",
    description: "Community is publicly visible and joinable",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const createdVisibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(createdVisibilityLevel);

  // 4. Register a member user (memberUser join)
  const memberUserJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAuthorizedFromJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberUserAuthorizedFromJoin);

  // 5. Member user login (explicit) to ensure proper actor context
  const memberUserLoginBody = {
    identifier: memberUserJoinBody.email,
    password: memberUserJoinBody.password,
    ip: "127.0.0.1",
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberUserAuthorizedFromLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberUserLoginBody,
    });
  typia.assert(memberUserAuthorizedFromLogin);

  // 6. As member user, create a community using the visibility level
  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const createdCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(createdCommunity);

  TestValidator.equals(
    "created community identifier should match request",
    createdCommunity.identifier,
    communityCreateBody.identifier,
  );

  // 7. Re-authenticate as platform admin via login to ensure platformAdmin actor
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 8. Create at least one moderator assignment for the community.
  const now = new Date();
  const assignedAtIso = now.toISOString();

  const moderatorAssignmentCreateBody = {
    communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
    assignedAt: assignedAtIso,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const createdAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: createdCommunity.identifier,
        body: moderatorAssignmentCreateBody,
      },
    );
  typia.assert(createdAssignment);

  TestValidator.equals(
    "created assignment community should match created community",
    createdAssignment.community.id,
    createdCommunity.id,
  );

  // 9. List moderator assignments for the community with activeOnly=true
  const listRequestBody = {
    page: 1,
    pageSize: 20,
    activeOnly: true,
    includeRevoked: false,
    includeSoftDeleted: false,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.IRequest;

  const listResponse: IPageICommunityPlatformCommunityModeratorAssignment.ISummary =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.index(
      connection,
      {
        communityIdentifier: createdCommunity.identifier,
        body: listRequestBody,
      },
    );
  typia.assert(listResponse);

  const pagination: IPage.IPagination = listResponse.pagination;
  const items: ICommunityPlatformCommunityModeratorAssignment.ISummary[] =
    listResponse.data;

  // 10. Basic pagination assertions
  TestValidator.equals(
    "pagination current page should be 1",
    pagination.current,
    1,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be >= data length",
    pagination.records >= items.length,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when records is 0, pages should be 0",
      pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "when records > 0, pages should be at least 1",
      pagination.pages >= 1,
    );
  }

  // Ensure we have at least one assignment (the one we just created)
  TestValidator.predicate(
    "assignment list should contain at least one item",
    items.length >= 1,
  );

  // 11. Validate each listed item: scoped to community, active, moderator association present
  for (const item of items) {
    TestValidator.equals(
      "listed assignment community id should match created community",
      item.community.id,
      createdCommunity.id,
    );

    TestValidator.predicate(
      "listed assignment should be active when activeOnly=true",
      item.is_active === true,
    );

    TestValidator.predicate(
      "moderator summary id should be a non-empty string",
      item.moderator.id.length > 0,
    );

    TestValidator.predicate(
      "moderator summary username should be non-empty",
      item.moderator.username.length > 0,
    );

    TestValidator.predicate(
      "moderator account status key should be non-empty",
      item.moderator.account_status.key.length > 0,
    );
  }
}
