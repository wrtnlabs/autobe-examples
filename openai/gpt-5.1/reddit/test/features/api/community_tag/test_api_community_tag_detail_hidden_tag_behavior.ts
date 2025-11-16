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
 * Validate public tag detail behavior when a community tag is hidden.
 *
 * Business goals:
 *
 * - Ensure that a community tag created as visible can be fetched via the public
 *   tag-detail endpoint.
 * - Verify that a community moderator can toggle the tag's visibility to hidden
 *   (isVisible=false) and that the change is reflected when re-fetching the tag
 *   detail.
 * - Confirm that the detail endpoint remains publicly accessible (no auth
 *   required) and returns a consistent ICommunityPlatformCommunityTag payload
 *   before and after the visibility change.
 *
 * End-to-end workflow:
 *
 * 1. Platform admin joins and (optionally) logs in.
 * 2. Platform admin creates a community visibility level (e.g., "public").
 * 3. Member user joins and logs in, then creates a community using the created
 *    visibility level code.
 * 4. Community moderator joins and logs in.
 * 5. Moderator creates a visible tag (isVisible=true) under the community.
 * 6. Using a public (unauthenticated) connection, call the public tag detail
 *    endpoint to establish baseline visibility and content.
 * 7. Moderator updates the tag to set isVisible=false.
 * 8. Using a new public connection, fetch the tag detail again and verify that the
 *    tag is still retrievable and that the isVisible flag has changed, as well
 *    as updatedAt being different from the previous value.
 *
 * We do not assert specific HTTP status codes or type errors; instead we focus
 * on business-state changes and data consistency across authenticated and
 * unauthenticated callers.
 */
export async function test_api_community_tag_detail_hidden_tag_behavior(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (acts as initial setup actor)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `visibility_${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public",
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
    "created visibility level code should match request code",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins and logs in
  const memberJoinEmail = typia.random<string & tags.Format<"email">>();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberJoinEmail,
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorizedJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorizedJoin);

  const memberLoginBody = {
    identifier: memberJoinEmail,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberAuthorizedLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberAuthorizedLogin);

  // 4. Member user creates a community using the created visibility level code
  const communityIdentifier = `comm_${RandomGenerator.alphaNumeric(6)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityCode,
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
    "community identifier should match create DTO",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code should match created level",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. Community moderator joins and logs in
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(12),
    display_name: null,
    ip: null,
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorizedJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorizedJoin);

  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorJoinBody.password,
    ip: null,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorAuthorizedLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorAuthorizedLogin);

  // 6. Moderator creates a visible tag under the community
  const tagCreateBody = {
    label: RandomGenerator.paragraph({ sentences: 1 }),
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    isVisible: true,
    order: undefined,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const createdTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagCreateBody,
      },
    );
  typia.assert(createdTag);
  TestValidator.equals(
    "created tag should be visible initially",
    createdTag.isVisible,
    true,
  );

  // Prepare a public (unauthenticated) connection by clearing headers
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Public caller fetches tag detail (baseline)
  const publicBaselineTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communities.tags.at(
      publicConnection,
      {
        communityIdentifier: community.identifier,
        tagId: createdTag.id,
      },
    );
  typia.assert(publicBaselineTag);
  TestValidator.equals(
    "public baseline tag id should match created tag id",
    publicBaselineTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "public baseline tag visibility should be true",
    publicBaselineTag.isVisible,
    true,
  );

  // 8. Moderator updates the tag to hide it (isVisible=false)
  const tagUpdateBody = {
    isVisible: false,
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  const updatedTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.update(
      connection,
      {
        communityIdentifier: community.identifier,
        tagId: createdTag.id,
        body: tagUpdateBody,
      },
    );
  typia.assert(updatedTag);
  TestValidator.equals(
    "updated tag visibility should be false",
    updatedTag.isVisible,
    false,
  );

  // 9. Public caller fetches tag detail again after hiding
  const publicAfterHideTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communities.tags.at(
      publicConnection,
      {
        communityIdentifier: community.identifier,
        tagId: createdTag.id,
      },
    );
  typia.assert(publicAfterHideTag);

  // Business validations: id consistency and visibility change observable via
  // public endpoint, plus updatedAt change.
  TestValidator.equals(
    "public after-hide tag id should remain stable",
    publicAfterHideTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "public after-hide tag visibility should be false",
    publicAfterHideTag.isVisible,
    false,
  );
  TestValidator.notEquals(
    "updatedAt should change after visibility update (comparing baseline vs after-hide)",
    publicBaselineTag.updatedAt,
    publicAfterHideTag.updatedAt,
  );
}
