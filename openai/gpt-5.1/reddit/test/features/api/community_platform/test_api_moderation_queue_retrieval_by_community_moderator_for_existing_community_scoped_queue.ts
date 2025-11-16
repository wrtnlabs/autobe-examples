import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a community-scoped moderation queue is retrievable by an
 * authenticated community moderator.
 *
 * Business flow:
 *
 * 1. Platform admin defines a visibility level for communities.
 * 2. Member user self-registers and creates a community using that visibility
 *    level.
 * 3. Platform admin registers and logs in, then grants the member user a
 *    membership in the created community.
 * 4. Platform admin creates a moderation queue scoped to that community
 *    (community_id set to the community's id).
 * 5. Community moderator registers and logs in.
 * 6. Community moderator retrieves the moderation queue using the dedicated
 *    communityModerator endpoint and the queue's id.
 *
 * The test asserts that:
 *
 * - The GET endpoint responds with a valid ICommunityPlatformModerationQueue.
 * - The returned queue id matches the created queue id.
 * - The queue is community-scoped and its community_id matches the created
 *   community id.
 * - The name, queue_type, and status are non-empty strings.
 * - Created_at and updated_at timestamps are present and well-formed (validated
 *   by typia.assert).
 * - No authorization error occurs for the authenticated community moderator.
 */
export async function test_api_moderation_queue_retrieval_by_community_moderator_for_existing_community_scoped_queue(
  connection: api.IConnection,
) {
  // 1. Platform admin creates a visibility level
  const visibilityCode: string = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityPayload = {
    code: visibilityCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityPayload },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 2. Member user joins and creates a community
  const memberJoinPayload = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinPayload,
    });
  typia.assert(memberAuthorized);

  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(10)}`;
  const communityPayload = {
    identifier: communityIdentifier,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityPayload },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match creation payload",
    community.identifier,
    communityIdentifier,
  );

  // 3. Platform admin joins and logs in
  const platformAdminJoinPayload = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinPayload,
    });
  typia.assert(platformAdminAuthorized);

  const platformAdminLoginPayload = {
    identifier: platformAdminJoinPayload.email,
    password: platformAdminJoinPayload.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginPayload,
    });
  typia.assert(platformAdminLoginResult);

  // 4. Platform admin grants community membership to the member user
  const membershipPayload = {
    memberuser_id: memberAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membership: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: membershipPayload,
      },
    );
  typia.assert(membership);
  TestValidator.equals(
    "membership community id should match created community id",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member user id should match joining member",
    membership.memberuser.id,
    memberAuthorized.id,
  );

  // 5. Platform admin creates a community-scoped moderation queue
  const queueName = `queue_${RandomGenerator.alphaNumeric(8)}`;
  const queueType = "community_default";
  const queueStatus = "active";
  const moderationQueueCreatePayload = {
    community_id: community.id,
    name: queueName,
    queue_type: queueType,
    status: queueStatus,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      { body: moderationQueueCreatePayload },
    );
  typia.assert(createdQueue);

  TestValidator.equals(
    "created queue name should match payload",
    createdQueue.name,
    queueName,
  );
  TestValidator.equals(
    "created queue type should match payload",
    createdQueue.queue_type,
    queueType,
  );
  TestValidator.equals(
    "created queue status should match payload",
    createdQueue.status,
    queueStatus,
  );
  TestValidator.equals(
    "created queue community_id should match community id",
    createdQueue.community_id,
    community.id,
  );

  // 6. Community moderator joins and logs in
  const moderatorJoinPayload = {
    username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://moderator.example.com/signup",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinPayload,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginPayload = {
    identifier: moderatorJoinPayload.email,
    password: moderatorJoinPayload.password,
    ip: null,
    href: "https://moderator.example.com/login",
    referrer: "https://moderator.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginPayload,
    });
  typia.assert(moderatorLoginResult);

  // 7. Community moderator retrieves the moderation queue
  const fetchedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.communityModerator.moderationQueues.at(
      connection,
      {
        moderationQueueId: createdQueue.id,
      },
    );
  typia.assert(fetchedQueue);

  // 8. Business logic assertions on fetched queue
  TestValidator.equals(
    "fetched queue id should equal created queue id",
    fetchedQueue.id,
    createdQueue.id,
  );
  TestValidator.equals(
    "fetched queue community_id should equal community id",
    fetchedQueue.community_id,
    community.id,
  );
  TestValidator.equals(
    "fetched queue name should match created queue",
    fetchedQueue.name,
    createdQueue.name,
  );
  TestValidator.equals(
    "fetched queue type should match created queue",
    fetchedQueue.queue_type,
    createdQueue.queue_type,
  );
  TestValidator.equals(
    "fetched queue status should match created queue",
    fetchedQueue.status,
    createdQueue.status,
  );

  TestValidator.predicate(
    "fetched queue name is non-empty",
    fetchedQueue.name.length > 0,
  );
  TestValidator.predicate(
    "fetched queue type is non-empty",
    fetchedQueue.queue_type.length > 0,
  );
  TestValidator.predicate(
    "fetched queue status is non-empty",
    fetchedQueue.status.length > 0,
  );

  TestValidator.predicate(
    "created_at timestamp is present",
    typeof fetchedQueue.created_at === "string" &&
      fetchedQueue.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    typeof fetchedQueue.updated_at === "string" &&
      fetchedQueue.updated_at.length > 0,
  );
}
