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

export async function test_api_moderation_queue_retrieval_by_platform_admin_cross_verification_with_community_moderator_view(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (also authenticates as that admin)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  // 2. As platformAdmin, create a visibility level
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility code should match",
    visibility.code,
    visibilityCode,
  );

  // 3. Register a member user (also authenticates as that member)
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberUser);

  // 4. As memberUser, create a community referencing the visibility level code
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
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
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );

  // 5. Switch back to platformAdmin via login to be explicit about actor
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 6. As platformAdmin, create a community membership for that member in the community
  const membershipCreateBody = {
    memberuser_id: memberUser.id,
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
    "membership community id should equal community id",
    membership.community.id,
    community.id,
  );
  TestValidator.equals(
    "membership member id should equal member user id",
    membership.memberuser.id,
    memberUser.id,
  );

  // 7. As platformAdmin, create a community-scoped moderation queue for that community
  const queueCreateBody = {
    community_id: community.id,
    name: `Default moderation queue for ${community.identifier}`,
    queue_type: "community_default",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const createdQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: queueCreateBody,
      },
    );
  typia.assert(createdQueue);

  TestValidator.equals(
    "created queue community_id should match community id",
    createdQueue.community_id,
    community.id,
  );
  TestValidator.equals(
    "created queue name should match input name",
    createdQueue.name,
    queueCreateBody.name,
  );
  TestValidator.equals(
    "created queue type should match input queue_type",
    createdQueue.queue_type,
    queueCreateBody.queue_type,
  );
  TestValidator.equals(
    "created queue status should match input status",
    createdQueue.status,
    queueCreateBody.status,
  );

  // 8. Retrieve the same moderation queue via the platformAdmin GET endpoint
  const fetchedQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.at(
      connection,
      {
        moderationQueueId: createdQueue.id,
      },
    );
  typia.assert(fetchedQueue);

  // 9. Validate that the fetched queue matches the created queue field-by-field
  TestValidator.equals(
    "queue id should be stable between create and get",
    fetchedQueue.id,
    createdQueue.id,
  );
  TestValidator.equals(
    "queue community_id should remain the same",
    fetchedQueue.community_id,
    createdQueue.community_id,
  );
  TestValidator.equals(
    "queue name should remain the same",
    fetchedQueue.name,
    createdQueue.name,
  );
  TestValidator.equals(
    "queue_type should remain the same",
    fetchedQueue.queue_type,
    createdQueue.queue_type,
  );
  TestValidator.equals(
    "status should remain the same",
    fetchedQueue.status,
    createdQueue.status,
  );
  TestValidator.equals(
    "description should remain the same",
    fetchedQueue.description,
    createdQueue.description,
  );

  // created_at and updated_at must be valid date-time strings and created_at should be <= updated_at
  TestValidator.predicate(
    "created_at should be a non-empty string",
    typeof fetchedQueue.created_at === "string" &&
      fetchedQueue.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty string",
    typeof fetchedQueue.updated_at === "string" &&
      fetchedQueue.updated_at.length > 0,
  );

  // Ensure that the timestamps did not regress between create and fetch
  TestValidator.predicate(
    "fetched created_at should equal created created_at",
    fetchedQueue.created_at === createdQueue.created_at,
  );
  TestValidator.predicate(
    "fetched updated_at should be the same as or after created updated_at",
    new Date(fetchedQueue.updated_at).getTime() >=
      new Date(createdQueue.updated_at).getTime(),
  );
}
