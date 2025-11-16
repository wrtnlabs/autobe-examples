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
 * Validate that a community moderator can retrieve a moderation queue
 * definition that belongs to a different community.
 *
 * Business workflow:
 *
 * 1. Platform admin registers (join) and becomes authenticated.
 * 2. Platform admin creates a community visibility level master record.
 * 3. Member user A joins and creates Community A with that visibility level.
 * 4. Member user B joins and creates Community B with the same visibility level.
 * 5. Platform admin logs in (to ensure we are in platformAdmin context) and
 *    creates a membership in Community A for member user B.
 * 6. Platform admin creates Moderation Queue A scoped to Community A.
 * 7. Platform admin may also create another queue for Community B (optional), to
 *    ensure a multi-community environment.
 * 8. Community moderator joins and logs in, obtaining moderator actor context.
 * 9. Community moderator calls GET moderationQueues.at for Moderation Queue A
 *    (which belongs to Community A, not necessarily the moderator's own
 *    community), relying on platform rules that allow queue-definition level
 *    cross-community visibility.
 * 10. Validate that the response matches ICommunityPlatformModerationQueue and that
 *     community_id is Community A.id, confirming cross-community read-level
 *     visibility of queue definitions.
 */
export async function test_api_moderation_queue_retrieval_by_community_moderator_for_different_community(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join) and become authenticated
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
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

  // 2. Create community visibility level master record
  const visibilityLevelCreateBody = {
    code: `public_${RandomGenerator.alphaNumeric(8)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user A joins and authenticates
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberAAuthorized);

  // 4. Member user A creates Community A with that visibility level code
  const communityIdentifierA = `community-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityACreateBody = {
    identifier: communityIdentifierA,
    title: `Community A ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert(communityA);

  // 5. Member user B joins and authenticates, then creates Community B
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberBAuthorized);

  const communityIdentifierB = `community-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityBCreateBody = {
    identifier: communityIdentifierB,
    title: `Community B ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert(communityB);

  // 6. Switch back to platformAdmin context via login to ensure correct actor
  const platformAdminLoginBody = {
    identifier: platformAdminAuthorized.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 7. Create membership in Community A for member user B
  const membershipCreateBody = {
    memberuser_id: memberBAuthorized.id,
    is_active: true,
  } satisfies ICommunityPlatformCommunityMembership.ICreate;

  const membershipAForB: ICommunityPlatformCommunityMembership =
    await api.functional.communityPlatform.platformAdmin.communities.memberships.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: membershipCreateBody,
      },
    );
  typia.assert(membershipAForB);

  TestValidator.equals(
    "membership community matches Community A",
    membershipAForB.community.id,
    communityA.id,
  );

  // 8. Platform admin creates Moderation Queue A scoped to Community A
  const moderationQueueACreateBody = {
    community_id: communityA.id,
    name: `Queue A ${RandomGenerator.name(1)}`,
    queue_type: "community_default",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const moderationQueueA: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: moderationQueueACreateBody,
      },
    );
  typia.assert(moderationQueueA);

  TestValidator.equals(
    "moderationQueueA.community_id should equal Community A id",
    moderationQueueA.community_id ?? null,
    communityA.id,
  );

  // 9. Optionally create a queue for Community B to ensure multi-community env
  const moderationQueueBCreateBody = {
    community_id: communityB.id,
    name: `Queue B ${RandomGenerator.name(1)}`,
    queue_type: "community_default",
    status: "active",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformModerationQueue.ICreate;

  const moderationQueueB: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.platformAdmin.moderationQueues.create(
      connection,
      {
        body: moderationQueueBCreateBody,
      },
    );
  typia.assert(moderationQueueB);

  // 10. Community moderator joins and logs in
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://mod.example.com/login",
    referrer: "https://mod.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // 11. Community moderator retrieves Moderation Queue A by id
  const retrievedQueueA: ICommunityPlatformModerationQueue =
    await api.functional.communityPlatform.communityModerator.moderationQueues.at(
      connection,
      {
        moderationQueueId: moderationQueueA.id,
      },
    );
  typia.assert(retrievedQueueA);

  // 12. Validate that the retrieved queue matches Moderation Queue A and is
  // associated with Community A, confirming cross-community visibility.
  TestValidator.equals(
    "retrieved queue A id matches created queue A id",
    retrievedQueueA.id,
    moderationQueueA.id,
  );

  TestValidator.equals(
    "retrieved queue A community_id matches Community A id",
    retrievedQueueA.community_id ?? null,
    communityA.id,
  );

  TestValidator.equals(
    "retrieved queue A queue_type matches configured type",
    retrievedQueueA.queue_type,
    moderationQueueA.queue_type,
  );

  TestValidator.equals(
    "retrieved queue A status matches configured status",
    retrievedQueueA.status,
    moderationQueueA.status,
  );
}
