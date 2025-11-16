import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Ensure community-level tag slug uniqueness within a community while allowing
 * the same slug in another community.
 *
 * Business goal:
 *
 * - A communityModerator should be able to define per-community tags.
 * - Tag `slug` must be unique within a given community.
 * - The same `slug` may be reused in other communities.
 *
 * Workflow:
 *
 * 1. Platform admin joins and creates a visibility level code to be used by
 *    communities.
 * 2. Member user joins and creates Community A using the created visibility level.
 * 3. Another member user joins and creates Community B using the same visibility
 *    level.
 * 4. Community moderator joins (and is automatically authenticated by join).
 * 5. As communityModerator, create a tag in Community A with a fixed slug (e.g.,
 *    "news"). This must succeed.
 * 6. Attempt to create a second tag in Community A with the same slug. This must
 *    fail.
 * 7. Create a tag in Community B with the same slug. This must succeed, showing
 *    slug uniqueness is scoped per community.
 */
export async function test_api_community_tag_creation_rejects_duplicate_slug_within_community(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level used by communities
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 3. Member user #1 joins
  const memberUser1JoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "192.168.0.10",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser1Authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUser1JoinBody,
    });
  typia.assert(memberUser1Authorized);

  // 4. Member user #1 creates Community A
  const communityAIdentifier = `community-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityACreateBody = {
    identifier: communityAIdentifier,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityACreateBody },
    );
  typia.assert(communityA);
  TestValidator.equals(
    "community A identifier should match the requested identifier",
    communityA.identifier,
    communityAIdentifier,
  );

  // 5. Member user #2 joins
  const memberUser2JoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: "192.168.0.11",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUser2Authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUser2JoinBody,
    });
  typia.assert(memberUser2Authorized);

  // 6. Member user #2 creates Community B
  const communityBIdentifier = `community-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityBCreateBody = {
    identifier: communityBIdentifier,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBCreateBody },
    );
  typia.assert(communityB);
  TestValidator.equals(
    "community B identifier should match the requested identifier",
    communityB.identifier,
    communityBIdentifier,
  );

  // 7. Community moderator joins (auto-authenticated)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "203.0.113.5",
    href: "https://community.example.com/moderator/register",
    referrer: "https://community.example.com/admin",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 8. As communityModerator, create initial tag in Community A
  const sharedSlug = "news";
  const tagCreateBodyA1 = {
    label: "News",
    slug: sharedSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagA1: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: tagCreateBodyA1,
      },
    );
  typia.assert(tagA1);
  TestValidator.equals(
    "first tag in community A should use the shared slug",
    tagA1.slug,
    sharedSlug,
  );

  // 9. Attempt duplicate slug in the same community - must fail
  const tagCreateBodyA2 = {
    label: "Breaking News",
    slug: sharedSlug,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isVisible: true,
    order: 2,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  await TestValidator.error(
    "creating a second tag with the same slug in the same community must fail",
    async () => {
      await api.functional.communityPlatform.communityModerator.communities.tags.create(
        connection,
        {
          communityIdentifier: communityA.identifier,
          body: tagCreateBodyA2,
        },
      );
    },
  );

  // 10. Create tag with same slug in a different community - must succeed
  const tagCreateBodyB1 = {
    label: "News in B",
    slug: sharedSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagB1: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: communityB.identifier,
        body: tagCreateBodyB1,
      },
    );
  typia.assert(tagB1);
  TestValidator.equals(
    "tag in community B should share the same slug but be allowed",
    tagB1.slug,
    sharedSlug,
  );
}
