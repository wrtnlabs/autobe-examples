import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationQueue";

export async function test_api_moderation_queues_index_for_community_moderator_with_community_scoped_queue(
  connection: api.IConnection,
) {
  // 1. Platform admin registration (auto-login)
  const platformAdminPassword = "Admin!234";
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Member user registration (auto-login)
  const memberPassword = "Member!234";
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberEmail,
    password: memberPassword,
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 3. As platform admin, create visibility level
  // (Already authenticated as platformAdmin because join set the token.)
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code matches",
    visibilityLevel.code,
    visibilityCode,
  );

  // 4. As member user, login and create community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://app.example.com/login",
      referrer: "https://app.example.com/",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(10)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier matches",
    community.identifier,
    communityIdentifier,
  );

  // 5. As platform admin, login and create membership for the member user
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const membershipCreateBody = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  TestValidator.equals(
    "membership community id matches",
    membership.community.id,
    community.id,
  );

  // 6. Community moderator registration (auto-login)
  const moderatorPassword = "Moderator!234";
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 7. As platform admin, ensure logged in and create moderator assignment
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminEmail,
      password: platformAdminPassword,
      ip: null,
      href: "https://admin.example.com/login2",
      referrer: "https://admin.example.com/dashboard",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const nowIso = new Date().toISOString();

  const moderatorAssignmentCreateBody = {
    communityModeratorId: moderatorAuthorized.id,
    assignedAt: nowIso,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentCreateBody,
      },
    );
  typia.assert(moderatorAssignment);

  TestValidator.equals(
    "moderator assignment community matches",
    moderatorAssignment.community.id,
    community.id,
  );

  // 8. As platform admin, create community-scoped moderation queue
  const queueType = "community_default";
  const queueStatus = "active";

  const moderationQueueCreateBody = {
    community_id: community.id,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    queue_type: queueType,
    status: queueStatus,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: moderationQueueCreateBody,
      },
    );
  typia.assert(createdQueue);

  TestValidator.equals(
    "created queue community_id matches",
    createdQueue.community_id,
    community.id,
  );

  // 9. Community moderator login (switch actor)
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: "https://mod.example.com/login",
      referrer: "https://mod.example.com/",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // 10. Moderator lists moderation queues filtered by community_id and queue_type
  const pageSize: number & tags.Type<"int32"> & tags.Minimum<1> = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;

  const moderationQueueIndexRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    queue_type: queueType,
    status: queueStatus,
    community_id: community.id,
    search: undefined,
    order_by: undefined,
    order_direction: undefined,
  } satisfies ICommunityPlatformModerationQueue.IRequest;

  const page: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.communityModerator.moderationQueues.index(
      connection,
      {
        body: moderationQueueIndexRequest,
      },
    );
  typia.assert(page);

  const pagination = page.pagination;
  const data = page.data;

  // 11. Validate pagination basics
  TestValidator.equals("pagination current page is 1", pagination.current, 1);

  TestValidator.predicate("pagination limit is positive", pagination.limit > 0);

  TestValidator.predicate(
    "pagination has at least one record",
    pagination.records >= 1,
  );

  TestValidator.predicate("pagination pages >= 1", pagination.pages >= 1);

  // 12. Validate that created queue is present and fields match
  const found = data.find((q) => q.id === createdQueue.id);
  TestValidator.predicate(
    "created queue appears in moderator listing",
    found !== undefined,
  );

  if (found !== undefined) {
    typia.assertGuard(found);

    TestValidator.equals(
      "queue id matches created queue",
      found.id,
      createdQueue.id,
    );
    TestValidator.equals(
      "queue name matches created queue",
      found.name,
      createdQueue.name,
    );
    TestValidator.equals(
      "queue type matches created queue",
      found.queue_type,
      createdQueue.queue_type,
    );
    TestValidator.equals(
      "queue status matches created queue",
      found.status,
      createdQueue.status,
    );
    TestValidator.equals(
      "queue community_id matches created queue",
      found.community_id,
      createdQueue.community_id,
    );
  }

  // 13. Validate that all returned queues are scoped to this community
  TestValidator.predicate(
    "all queues in result are scoped to the requested community",
    data.every((q) => q.community_id === community.id),
  );
}
