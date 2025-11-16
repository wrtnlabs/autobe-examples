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
 * Verify that a community tag cannot be fetched via a different community's
 * identifier, even when the tagId itself is valid.
 *
 * Business goal:
 *
 * - Ensure that the tag-detail endpoint GET
 *   /communityPlatform/communities/{communityIdentifier}/tags/{tagId} enforces
 *   community scoping and does not leak tag information across communities when
 *   the provided tagId belongs to another community.
 *
 * High-level steps:
 *
 * 1. As a platform admin, create a visibility level that can be reused by multiple
 *    communities.
 * 2. As member user A, create Community A using that visibility level.
 * 3. As member user B, create Community B using the same visibility level.
 * 4. As a community moderator, create Tag X under Community A.
 * 5. Optionally, still as moderator, create another tag under Community B just to
 *    confirm Community B supports tags.
 * 6. Using the same connection (authorization header managed by SDK), call the
 *    tag-detail endpoint with:
 *
 *    - CommunityIdentifier = Community B's identifier
 *    - TagId = Tag X's id (from Community A)
 * 7. Assert that this cross-community lookup fails with an error, confirming that
 *    tags are scoped to their community and cannot be retrieved via a
 *    mismatched communityIdentifier/tagId combination.
 */
export async function test_api_community_tag_detail_not_found_for_other_community(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (auto-authenticates) and creates a visibility level
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword = "PlatformAdmin#1";

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://example.com/admin/join",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // (Optional) Explicit login as platform admin, aligning with scenario deps
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: "https://example.com/admin/login",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoginResult);

  // Create a shared community visibility level
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Shared visibility",
    description: "Visibility level shared across test communities.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert(visibilityLevel);
  TestValidator.equals(
    "visibility level code should match requested code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 2. memberUser A joins and creates Community A
  const memberUserAPassword = "MemberUserA#1";
  const memberUserAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberUserAJoinBody = {
    username: `user-a-${RandomGenerator.alphaNumeric(6)}`,
    email: memberUserAEmail,
    password: memberUserAPassword,
    ip: "127.0.0.1",
    href: "https://example.com/member-a/join",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserAAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserAJoinBody,
    });
  typia.assert(memberUserAAuthorized);

  const communityIdentifierA = `community-a-${RandomGenerator.alphaNumeric(6)}`;
  const communityACreateBody = {
    identifier: communityIdentifierA,
    title: "Community A",
    description: "First test community for tag scoping.",
    visibilityLevelCode: visibilityCode,
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
  TestValidator.equals(
    "community A identifier should match requested identifier",
    communityA.identifier,
    communityIdentifierA,
  );

  // 3. memberUser B joins and creates Community B
  const memberUserBPassword = "MemberUserB#1";
  const memberUserBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberUserBJoinBody = {
    username: `user-b-${RandomGenerator.alphaNumeric(6)}`,
    email: memberUserBEmail,
    password: memberUserBPassword,
    ip: "127.0.0.1",
    href: "https://example.com/member-b/join",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberUserBAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserBJoinBody,
    });
  typia.assert(memberUserBAuthorized);

  const communityIdentifierB = `community-b-${RandomGenerator.alphaNumeric(6)}`;
  const communityBCreateBody = {
    identifier: communityIdentifierB,
    title: "Community B",
    description: "Second test community for tag scoping.",
    visibilityLevelCode: visibilityCode,
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
  TestValidator.equals(
    "community B identifier should match requested identifier",
    communityB.identifier,
    communityIdentifierB,
  );

  // 4. Community moderator joins (and becomes the active auth actor)
  const moderatorPassword = "Moderator#1";
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const moderatorJoinBody = {
    username: `mod-${RandomGenerator.alphaNumeric(6)}`,
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://example.com/mod/join",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // Optional explicit login for moderator
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: "https://example.com/mod/login",
    referrer: "https://example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginResult: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginResult);

  // 5. Moderator creates Tag X under Community A
  const tagXLabel = "Tag X";
  const tagXSlug = `tag-x-${RandomGenerator.alphaNumeric(6)}`;

  const tagXCreateBody = {
    label: tagXLabel,
    slug: tagXSlug,
    description: "Tag X scoped to Community A only.",
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagX: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: tagXCreateBody,
      },
    );
  typia.assert(tagX);
  TestValidator.equals(
    "tag X label should match requested label",
    tagX.label,
    tagXLabel,
  );

  // 6. Moderator creates a different tag under Community B (optional control)
  const tagBCreateBody = {
    label: "Community B Tag",
    slug: `tag-b-${RandomGenerator.alphaNumeric(6)}`,
    description: "Tag in Community B for control.",
    isVisible: true,
    order: 2,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tagB: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: communityB.identifier,
        body: tagBCreateBody,
      },
    );
  typia.assert(tagB);

  // Sanity check: tag ids should differ
  TestValidator.notEquals(
    "tag X id and Community B tag id must differ",
    tagX.id,
    tagB.id,
  );

  // 7. Cross-community tag detail fetch must fail
  await TestValidator.error(
    "tag detail must not be retrievable via other community identifier",
    async () => {
      await api.functional.communityPlatform.communities.tags.at(connection, {
        communityIdentifier: communityB.identifier,
        tagId: tagX.id,
      });
    },
  );
}
