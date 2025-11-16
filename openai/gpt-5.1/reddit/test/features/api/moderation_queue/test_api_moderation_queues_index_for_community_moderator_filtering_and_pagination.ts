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

/**
 * Validate community moderator moderation queue listing filters and pagination.
 *
 * Business flow implemented:
 *
 * 1. Platform admin joins and is authenticated (admin actor context).
 * 2. Community moderator joins and is authenticated (moderator actor context).
 * 3. Member user joins and is authenticated (member actor context).
 * 4. Platform admin creates a visibility level that member user can use.
 * 5. Member user creates a community referencing that visibility level.
 * 6. Platform admin creates a membership for the member user in that community.
 * 7. Platform admin assigns the community moderator to that community.
 * 8. Platform admin creates multiple moderation queues for that community with
 *    various queue_type/status combinations plus at least one queue tied to a
 *    different community (to verify isolation).
 * 9. Community moderator calls PATCH
 *    /communityPlatform/communityModerator/moderationQueues with specific
 *    ICommunityPlatformModerationQueue.IRequest filters (page, pageSize,
 *    community_id, queue_type, status, ordering) and receives paginated
 *    results.
 * 10. Validate that returned queues satisfy all filters, are correctly paginated
 *     and globally ordered by name across pages, and that queues from other
 *     communities or with mismatched type/status are excluded.
 */
export async function test_api_moderation_queues_index_for_community_moderator_filtering_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: platform admin registration (auto-authenticated)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "AdminPassword!123",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;
  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Step 2: community moderator registration (auto-authenticated)
  const communityModeratorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com`,
    password: "ModeratorPass!123",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.example.com/join",
    referrer: "https://moderator.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;
  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  const moderatorId = communityModeratorAuthorized.id;

  // Step 3: member user registration (auto-authenticated)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: "MemberPass!123",
    ip: "127.0.0.1",
    href: "https://member.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://member.example.com/" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberId = memberAuthorized.id;

  // Step 4: switch back to platform admin (login)
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  // Step 5: create a visibility level as platform admin
  const visibilityCode = `vis_${RandomGenerator.alphabets(6)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // Step 6: switch to member user and create a community
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: "127.0.0.1",
      href: "https://member.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://member.example.com/" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "Test Community For Moderation Queues",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const communityId = community.id;

  // Step 7: switch to platform admin and create a membership for the member user
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const membershipCreateBody = {
    memberuser_id: memberId,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;
  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membership);

  // Step 8: assign the moderator to the community as platform admin
  const assignmentCreateBody = {
    communityModeratorId: moderatorId,
    assignedAt: new Date().toISOString() as string & tags.Format<"date-time">,
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;
  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: communityIdentifier,
        body: assignmentCreateBody,
      },
    );
  typia.assert(assignment);

  // Step 9: create multiple moderation queues as platform admin
  const targetQueueTypeDefault = "community_default";
  const otherQueueTypeEscalated = "community_escalated";
  const statusActive = "active";
  const statusPaused = "paused";

  // Helper to create a queue
  const createQueue = async (
    name: string,
    queue_type: string,
    status: string,
    community_id: string | null,
  ): Promise<ICommunityPlatformModerationQueue> => {
    const body = {
      community_id: community_id,
      name,
      queue_type,
      status,
      description: RandomGenerator.paragraph({ sentences: 4 }),
    } satisfies ICommunityPlatformModerationQueue.ICreate;
    const created =
      await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
        connection,
        { body },
      );
    typia.assert(created);
    return created;
  };

  // Queues that should match the filter
  const matchingQueues: ICommunityPlatformModerationQueue[] = [];
  matchingQueues.push(
    await createQueue(
      "A-Default-Active-1",
      targetQueueTypeDefault,
      statusActive,
      communityId,
    ),
  );
  matchingQueues.push(
    await createQueue(
      "B-Default-Active-2",
      targetQueueTypeDefault,
      statusActive,
      communityId,
    ),
  );
  matchingQueues.push(
    await createQueue(
      "C-Default-Active-3",
      targetQueueTypeDefault,
      statusActive,
      communityId,
    ),
  );

  // Queues with different status or queue_type that should not match
  await createQueue(
    "Z-Default-Paused",
    targetQueueTypeDefault,
    statusPaused,
    communityId,
  );
  await createQueue(
    "Y-Escalated-Active",
    otherQueueTypeEscalated,
    statusActive,
    communityId,
  );

  // Extra queues in another community to verify community isolation
  const otherCommunityIdentifier = `community_${RandomGenerator.alphabets(8)}`;
  const otherCommunityCreateBody = {
    identifier: otherCommunityIdentifier,
    title: "Other Community For Isolation",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: "127.0.0.1",
      href: "https://member.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://member.example.com/" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  const otherCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: otherCommunityCreateBody,
      },
    );
  typia.assert(otherCommunity);
  const otherCommunityId = otherCommunity.id;

  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: "127.0.0.1",
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  await createQueue(
    "Q-OtherCommunity-Default-Active",
    targetQueueTypeDefault,
    statusActive,
    otherCommunityId,
  );

  // Step 10: login as community moderator to call index endpoint
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: communityModeratorJoinBody.email,
      password: communityModeratorJoinBody.password,
      ip: "127.0.0.1",
      href: "https://moderator.example.com/login" as string &
        tags.Format<"uri">,
      referrer: "https://moderator.example.com/" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // Prepare request for page 1 (pageSize = 2)
  const pageSize: number & tags.Type<"int32"> & tags.Minimum<1> = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const requestPage1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    queue_type: targetQueueTypeDefault,
    status: statusActive,
    community_id: communityId,
    search: null,
    order_by: "name",
    order_direction: "asc",
  } satisfies ICommunityPlatformModerationQueue.IRequest;

  const page1: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.communityModerator.moderationQueues.index(
      connection,
      { body: requestPage1 },
    );
  typia.assert(page1);

  // Validation: basic pagination
  const pagination1: IPage.IPagination = page1.pagination;
  typia.assert(pagination1);

  TestValidator.equals("page 1 current index", pagination1.current, 1);
  TestValidator.equals(
    "page size should not exceed requested pageSize",
    pagination1.limit,
    pageSize,
  );
  TestValidator.predicate(
    "page 1 data length <= pageSize",
    page1.data.length <= pageSize,
  );

  // Validation: all results satisfy filters and belong to the correct community
  for (const summary of page1.data) {
    typia.assert<ICommunityPlatformModerationQueue.ISummary>(summary);
    TestValidator.equals(
      "queue_type filter respected on page 1",
      summary.queue_type,
      targetQueueTypeDefault,
    );
    TestValidator.equals(
      "status filter respected on page 1",
      summary.status,
      statusActive,
    );
    TestValidator.equals(
      "community_id filter respected on page 1",
      summary.community_id,
      communityId,
    );
  }

  // Prepare request for page 2
  const requestPage2 = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    pageSize,
    queue_type: targetQueueTypeDefault,
    status: statusActive,
    community_id: communityId,
    search: null,
    order_by: "name",
    order_direction: "asc",
  } satisfies ICommunityPlatformModerationQueue.IRequest;

  const page2: IPageICommunityPlatformModerationQueue.ISummary =
    await api.functional.communityPlatform.communityModerator.moderationQueues.index(
      connection,
      { body: requestPage2 },
    );
  typia.assert(page2);

  const pagination2: IPage.IPagination = page2.pagination;
  typia.assert(pagination2);

  TestValidator.equals("page 2 current index", pagination2.current, 2);

  // We know we created 3 matching queues with pageSize 2,
  // so at least 2 pages are required to see all of them, but
  // the service may have additional matching queues globally.
  TestValidator.predicate(
    "records should be at least number of locally created matching queues",
    pagination1.records >= matchingQueues.length,
  );
  TestValidator.predicate(
    "pages count should be at least 1",
    pagination1.pages >= 1,
  );

  // Validation: filters again on page 2
  for (const summary of page2.data) {
    typia.assert<ICommunityPlatformModerationQueue.ISummary>(summary);
    TestValidator.equals(
      "queue_type filter respected on page 2",
      summary.queue_type,
      targetQueueTypeDefault,
    );
    TestValidator.equals(
      "status filter respected on page 2",
      summary.status,
      statusActive,
    );
    TestValidator.equals(
      "community_id filter respected on page 2",
      summary.community_id,
      communityId,
    );
  }

  // Combine page 1 and page 2 to test global ordering by name asc
  const combinedSummaries = [...page1.data, ...page2.data];
  const combinedNames = combinedSummaries.map((s) => s.name);
  const sortedNames = [...combinedNames].sort((a, b) => a.localeCompare(b));

  TestValidator.equals(
    "combined results are globally sorted by name ascending",
    combinedNames,
    sortedNames,
  );
}
