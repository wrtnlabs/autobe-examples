import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembership } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembership";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationQueue";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can retrieve a community-scoped
 * moderation queue they created.
 *
 * Business flow:
 *
 * 1. Platform admin joins (registers) and becomes authenticated.
 * 2. Platform admin creates a community visibility level to be referenced by
 *    communities.
 * 3. Member user joins and becomes authenticated.
 * 4. Member user creates a community using the created visibility level.
 * 5. Platform admin creates a community membership for the member user in that
 *    community.
 * 6. Platform admin creates a moderation queue scoped to the community.
 * 7. Platform admin retrieves the moderation queue by its id.
 * 8. The retrieved moderation queue must reflect the same configuration and
 *    community association as when created.
 */
export async function test_api_moderation_queue_retrieval_by_platform_admin_for_existing_community_scoped_queue(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) and becomes authenticated.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a community visibility level to be referenced by communities.
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
    "visibility level code should match creation payload",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Member user joins and becomes authenticated.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community using the created visibility level.
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
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

  TestValidator.equals(
    "community identifier should match creation payload",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community visibility level code should match",
    community.visibilityLevel.code,
    communityCreateBody.visibilityLevelCode,
  );

  // 5. Platform admin creates a community membership for the member user in that community.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.console.example.com/login",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

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
    "membership community id should match community",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership memberuser id should match joined member",
    membership.memberuser.id,
    memberAuthorized.id,
  );

  // 6. Platform admin creates a moderation queue scoped to the community.
  const moderationQueueCreateBody = {
    community_id: community.id,
    name: `Queue ${RandomGenerator.name(1)}`,
    queue_type: "community_default",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 4 }),
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
    "created queue community_id should match community.id",
    createdQueue.community_id,
    moderationQueueCreateBody.community_id,
  );
  TestValidator.equals(
    "created queue name should match request payload",
    createdQueue.name,
    moderationQueueCreateBody.name,
  );
  TestValidator.equals(
    "created queue queue_type should match request payload",
    createdQueue.queue_type,
    moderationQueueCreateBody.queue_type,
  );
  TestValidator.equals(
    "created queue status should match request payload",
    createdQueue.status,
    moderationQueueCreateBody.status,
  );
  TestValidator.equals(
    "created queue description should match request payload",
    createdQueue.description,
    moderationQueueCreateBody.description,
  );

  // 7. Platform admin retrieves the moderation queue by its id.
  const retrievedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.at(
      connection,
      {
        moderationQueueId: createdQueue.id,
      },
    );
  typia.assert(retrievedQueue);

  // 8. Validate that the retrieved queue matches the created queue.
  TestValidator.equals(
    "retrieved queue id should equal created queue id",
    retrievedQueue.id,
    createdQueue.id,
  );
  TestValidator.equals(
    "retrieved queue community_id should equal created queue community_id",
    retrievedQueue.community_id,
    createdQueue.community_id,
  );
  TestValidator.equals(
    "retrieved queue name should equal created queue name",
    retrievedQueue.name,
    createdQueue.name,
  );
  TestValidator.equals(
    "retrieved queue queue_type should equal created queue queue_type",
    retrievedQueue.queue_type,
    createdQueue.queue_type,
  );
  TestValidator.equals(
    "retrieved queue status should equal created queue status",
    retrievedQueue.status,
    createdQueue.status,
  );
  TestValidator.equals(
    "retrieved queue description should equal created queue description",
    retrievedQueue.description,
    createdQueue.description,
  );

  // 9. Validate timestamps are present and logically consistent.
  TestValidator.predicate(
    "created queue created_at should be defined",
    retrievedQueue.created_at.length > 0,
  );
  TestValidator.predicate(
    "created queue updated_at should be defined",
    retrievedQueue.updated_at.length > 0,
  );
}
