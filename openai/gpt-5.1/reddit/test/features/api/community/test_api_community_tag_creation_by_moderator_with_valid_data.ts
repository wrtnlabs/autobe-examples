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
 * Validate that a community moderator can create a community tag with valid
 * data.
 *
 * Business context:
 *
 * - Platform admins manage global configuration such as community visibility
 *   levels.
 * - Member users create communities and must reference a valid visibility level.
 * - Community moderators manage taxonomy (tags) within a specific community.
 *
 * This test performs the following steps:
 *
 * 1. Register and authenticate a platformAdmin.
 * 2. As platformAdmin, create a community visibility level.
 * 3. Register and authenticate a memberUser.
 * 4. As memberUser, create a community that references the visibility level
 *    created in step 2.
 * 5. Register and authenticate a communityModerator.
 * 6. As communityModerator, create a community tag for the community from step 4
 *    using a valid ICommunityPlatformCommunityTag.ICreate payload.
 * 7. Assert that the returned ICommunityPlatformCommunityTag reflects the input
 *    values and that system-managed fields are populated.
 */
export async function test_api_community_tag_creation_by_moderator_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (registers) and becomes authenticated.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Explicit login step to demonstrate actor switching, although join already authenticates.
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoggedIn: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLoggedIn);

  // 2. Platform admin creates a community visibility level to be used by communities.
  const visibilityCode = `vis_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community Visibility",
    description: "Visibility level used for public communities in tests.",
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

  // 3. Member user joins and logs in.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@member.test`,
    password: RandomGenerator.alphabets(16),
    ip: "127.0.0.1",
    href: "https://app.local/join",
    referrer: "https://app.local/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: "127.0.0.1",
    href: "https://app.local/login",
    referrer: "https://app.local/landing",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoggedIn: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoggedIn);

  // 4. Member user creates a community referencing the visibility level code.
  const communityIdentifier = `comm-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E Test Community for Tag Creation",
    description: RandomGenerator.paragraph({ sentences: 6 }),
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
    "community title should match creation payload",
    community.title,
    communityCreateBody.title,
  );
  TestValidator.equals(
    "community visibility code should match visibility level code",
    community.visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 5. Community moderator joins and logs in.
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(10)}@moderator.test`,
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.console.local/join",
    referrer: "https://mod.console.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const moderatorLoginBody = {
    identifier: moderatorJoinBody.email,
    password: moderatorJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mod.console.local/login",
    referrer: "https://mod.console.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoggedIn: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoggedIn);

  // 6. As communityModerator, create a community tag for the created community.
  const tagLabel = "integration-test-tag";
  const tagSlug = `slug-${RandomGenerator.alphabets(6)}`;
  const tagDescription = RandomGenerator.paragraph({ sentences: 4 });
  const tagOrder = 1;

  const tagCreateBody = {
    label: tagLabel,
    slug: tagSlug,
    description: tagDescription,
    isVisible: true,
    order: tagOrder,
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

  // 7. Validate returned tag fields against the requested payload and basic invariants.
  TestValidator.predicate(
    "created tag id should be a non-empty string",
    typeof createdTag.id === "string" && createdTag.id.length > 0,
  );
  TestValidator.equals(
    "created tag label should match request body",
    createdTag.label,
    tagCreateBody.label,
  );
  if (tagCreateBody.slug !== undefined) {
    TestValidator.equals(
      "created tag slug should match request body when provided",
      createdTag.slug,
      tagCreateBody.slug,
    );
  }
  if (tagCreateBody.description !== undefined) {
    TestValidator.equals(
      "created tag description should match request body when provided",
      createdTag.description,
      tagCreateBody.description,
    );
  }
  TestValidator.predicate(
    "created tag isVisible should be true",
    createdTag.isVisible === true,
  );
  if (tagCreateBody.order !== undefined) {
    TestValidator.equals(
      "created tag order should match request body when provided",
      createdTag.order,
      tagCreateBody.order,
    );
  }
}
