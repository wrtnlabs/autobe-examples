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

export async function test_api_moderation_queue_delete_community_scoped_queue_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin (join implicitly logs in)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
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
    "created visibility level code should match request",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Create a member user who will create the community
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community using the visibility level code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
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
  TestValidator.equals(
    "community identifier should match request",
    community.identifier,
    communityIdentifier,
  );

  // 5. Switch back to platform admin via login for subsequent admin-scoped calls
  const adminLoginBody = {
    identifier: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: adminJoinBody.ip,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. As platform admin, create a membership for the member user in that community
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
    "membership member user id should match member",
    membership.memberuser.id,
    memberAuthorized.id,
  );

  // 7. As platform admin, create a community-scoped moderation queue for that community
  const queueCreateBody = {
    community_id: community.id,
    name: `default-queue-${RandomGenerator.alphaNumeric(6)}`,
    queue_type: "community_default",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const moderationQueue: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: queueCreateBody,
      },
    );
  typia.assert(moderationQueue);
  TestValidator.equals(
    "moderation queue community_id should match community id",
    moderationQueue.community_id,
    community.id,
  );

  const moderationQueueId = moderationQueue.id;

  // 8. Delete the moderation queue as platform admin (happy path)
  await api.functional.communityPlatform.platformAdmin.moderationQueues.erase(
    connection,
    {
      moderationQueueId,
    },
  );

  // 9. Validate business semantics: deleting the same queue twice must fail
  await TestValidator.error(
    "deleting the same moderation queue twice should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.moderationQueues.erase(
        connection,
        {
          moderationQueueId,
        },
      );
    },
  );
}
