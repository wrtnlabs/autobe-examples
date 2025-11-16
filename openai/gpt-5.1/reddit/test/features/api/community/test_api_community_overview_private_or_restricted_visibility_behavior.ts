import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOverview";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate community overview behavior for public vs private visibility levels.
 *
 * Business goal
 *
 * - Ensure that visibility master data created by a platform admin is respected
 *   by community creation and by the unauthenticated overview endpoint.
 * - Confirm that overview responses expose the correct visibility_level summary
 *   and surface community tags created by a community moderator.
 *
 * High level workflow
 *
 * 1. Platform admin bootstrap
 *
 *    - Call auth.platformAdmin.join with realistic credentials to create a platform
 *         admin; typia.assert the ICommunityPlatformPlatformadmin.IAuthorized
 *         response.
 * 2. Visibility level master setup
 *
 *    - As the platformAdmin actor, call
 *         communityPlatform.platformAdmin.communityVisibilityLevels.create
 *         twice: a. Once with body.code = "public-vis" and a descriptive
 *         name/description. b. Once with body.code = "private-vis" and a
 *         descriptive name/description.
 *    - Typia.assert both ICommunityPlatformCommunityVisibilityLevel responses.
 *    - Use TestValidator.equals to verify that returned code fields equal the
 *         requested codes so we can rely on them when creating communities.
 * 3. Member user and communities
 *
 *    - Call auth.memberUser.join with random but valid email/username/password and
 *         href/referrer URIs to establish a memberUser actor. Assert the
 *         resulting ICommunityPlatformMemberuser.IAuthorized.
 *    - As this memberUser, call communityPlatform.memberUser.communities.create
 *         twice to create: a. communityPublic with visibilityLevelCode:
 *         "public-vis". b. communityPrivate with visibilityLevelCode:
 *         "private-vis". Both with distinct identifiers and titles so that we
 *         can call overview by identifier. typia.assert the returned
 *         ICommunityPlatformCommunity values, and use TestValidator.equals to
 *         ensure each community's visibilityLevel.code equals the expected
 *         code.
 * 4. Community moderator and tags
 *
 *    - Call auth.communityModerator.join with valid payload; assert
 *         ICommunityPlatformCommunityModerator.IAuthorized.
 *    - As communityModerator, create at least one tag for each community via
 *         communityPlatform.communityModerator.communities.tags.create using
 *         the community.identifier and an
 *         ICommunityPlatformCommunityTag.ICreate body. typia.assert tag
 *         responses.
 * 5. Unauthenticated overview calls
 *
 *    - Derive an unauthenticated connection by cloning the provided connection and
 *         replacing headers with an empty object.
 *    - Using this unauthenticatedConnection, call
 *         communityPlatform.communities.overview.at for each of
 *         communityPublic.identifier and communityPrivate.identifier.
 *    - Typia.assert both ICommunityPlatformCommunityOverview responses.
 * 6. Business validations
 *
 *    - For the public community overview:
 *
 *         - TestValidator.equals: overviewPublic.identifier equals the underlying
 *                   communityPublic.identifier.
 *         - TestValidator.equals: overviewPublic.visibility_level.code equals
 *                   "public-vis" and equals
 *                   communityPublic.visibilityLevel.code.
 *         - TestValidator.predicate: overviewPublic.tags.length is at least 1.
 *    - For the private community overview:
 *
 *         - Focus on visibility metadata consistency instead of status codes.
 *         - TestValidator.equals: overviewPrivate.identifier equals
 *                   communityPrivate.identifier.
 *         - TestValidator.equals: overviewPrivate.visibility_level.code equals
 *                   "private-vis" and equals
 *                   communityPrivate.visibilityLevel.code.
 *         - TestValidator.predicate: overviewPrivate.tags.length is at least 1.
 *    - In both cases, use TestValidator.predicate to assert that member_count and
 *         subscriber_count are non-negative integers.
 */
export async function test_api_community_overview_private_or_restricted_visibility_behavior(
  connection: api.IConnection,
) {
  // 1. Platform admin join (implicitly authenticates this actor)
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create visibility levels as platform admin
  const publicVisBody = {
    code: "public-vis",
    name: "Public Visibility",
    description:
      "Communities visible to everyone, including unauthenticated visitors.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const privateVisBody = {
    code: "private-vis",
    name: "Private Visibility",
    description:
      "Communities that may restrict visibility to members or authorized actors.",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const publicVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: publicVisBody },
    );
  typia.assert(publicVisibility);

  const privateVisibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: privateVisBody },
    );
  typia.assert(privateVisibility);

  TestValidator.equals(
    "public visibility level code should be 'public-vis'",
    publicVisibility.code,
    "public-vis",
  );
  TestValidator.equals(
    "private visibility level code should be 'private-vis'",
    privateVisibility.code,
    "private-vis",
  );

  // 3. Member user join and communities
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.2",
    href: "https://community.local/signup",
    referrer: "https://community.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.2",
    href: "https://community.local/login",
    referrer: "https://community.local/home",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // Create two communities with different visibilityLevelCode values
  const publicCommunityIdentifier = `public-${RandomGenerator.alphabets(8)}`;
  const privateCommunityIdentifier = `private-${RandomGenerator.alphabets(8)}`;

  const publicCommunityBody = {
    identifier: publicCommunityIdentifier,
    title: "Public Visibility Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: publicVisBody.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const privateCommunityBody = {
    identifier: privateCommunityIdentifier,
    title: "Private Visibility Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: privateVisBody.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: publicCommunityBody },
    );
  typia.assert(publicCommunity);

  const privateCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: privateCommunityBody },
    );
  typia.assert(privateCommunity);

  TestValidator.equals(
    "public community visibilityLevel.code should equal 'public-vis'",
    publicCommunity.visibilityLevel.code,
    publicVisBody.code,
  );
  TestValidator.equals(
    "private community visibilityLevel.code should equal 'private-vis'",
    privateCommunity.visibilityLevel.code,
    privateVisBody.code,
  );

  // 4. Community moderator join
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.3",
    href: "https://community.local/moderator/join",
    referrer: "https://community.local/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.3",
    href: "https://community.local/moderator/login",
    referrer: "https://community.local/moderator/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // Create at least one tag for each community via communityModerator
  const publicTagBody = {
    label: "public-tag",
    slug: "public-tag",
    description: "Tag attached to public community for overview verification.",
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const privateTagBody = {
    label: "private-tag",
    slug: "private-tag",
    description: "Tag attached to private community for overview verification.",
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const publicTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: publicCommunity.identifier,
        body: publicTagBody,
      },
    );
  typia.assert(publicTag);

  const privateTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: privateCommunity.identifier,
        body: privateTagBody,
      },
    );
  typia.assert(privateTag);

  // 5. Unauthenticated overview calls: clone connection with empty headers
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const publicOverview: ICommunityPlatformCommunityOverview =
    await api.functional.communityPlatform.communities.overview.at(
      unauthConnection,
      {
        communityIdentifier: publicCommunity.identifier,
      },
    );
  typia.assert(publicOverview);

  const privateOverview: ICommunityPlatformCommunityOverview =
    await api.functional.communityPlatform.communities.overview.at(
      unauthConnection,
      {
        communityIdentifier: privateCommunity.identifier,
      },
    );
  typia.assert(privateOverview);

  // 6. Business validations
  // Public community overview checks
  TestValidator.equals(
    "public overview identifier should match community identifier",
    publicOverview.identifier,
    publicCommunity.identifier,
  );
  TestValidator.equals(
    "public overview visibility_level.code should be 'public-vis'",
    publicOverview.visibility_level.code,
    publicVisBody.code,
  );
  TestValidator.equals(
    "public overview visibility_level.code should match community visibilityLevel.code",
    publicOverview.visibility_level.code,
    publicCommunity.visibilityLevel.code,
  );

  TestValidator.predicate(
    "public overview should have at least one tag",
    publicOverview.tags.length >= 1,
  );
  TestValidator.predicate(
    "public overview member_count should be non-negative",
    publicOverview.member_count >= 0,
  );
  TestValidator.predicate(
    "public overview subscriber_count should be non-negative",
    publicOverview.subscriber_count >= 0,
  );

  // Private community overview checks
  TestValidator.equals(
    "private overview identifier should match community identifier",
    privateOverview.identifier,
    privateCommunity.identifier,
  );
  TestValidator.equals(
    "private overview visibility_level.code should be 'private-vis'",
    privateOverview.visibility_level.code,
    privateVisBody.code,
  );
  TestValidator.equals(
    "private overview visibility_level.code should match community visibilityLevel.code",
    privateOverview.visibility_level.code,
    privateCommunity.visibilityLevel.code,
  );

  TestValidator.predicate(
    "private overview should have at least one tag",
    privateOverview.tags.length >= 1,
  );
  TestValidator.predicate(
    "private overview member_count should be non-negative",
    privateOverview.member_count >= 0,
  );
  TestValidator.predicate(
    "private overview subscriber_count should be non-negative",
    privateOverview.subscriber_count >= 0,
  );
}
