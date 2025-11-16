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
 * Validate anonymous public community overview landing page metadata.
 *
 * Business goal: Ensure that a public community, once configured with a
 * visibility level and at least one tag, exposes a correct, anonymous-readable
 * overview via GET
 * /communityPlatform/communities/{communityIdentifier}/overview. The overview
 * should include core identity fields, visibility summary, tag summaries,
 * aggregate member/subscriber counts, and archival/removal flags, without
 * requiring Authorization headers.
 *
 * High level steps:
 *
 * 1. Register a platform admin actor and create a new visibility level.
 * 2. Register a member user actor and create a community that references that
 *    visibility level.
 * 3. Register a community moderator actor and add at least one tag to the
 *    community.
 * 4. Call the overview endpoint anonymously and validate landing metadata.
 */
export async function test_api_community_overview_public_community_landing(
  connection: api.IConnection,
) {
  // 1. Register platform admin and create a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const visibilityCodeBase = `public-test-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCodeBase,
    name: `Public Test ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  TestValidator.equals(
    "visibility level code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 2. Register member user and create community
  const memberUserJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberUserJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(10)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });
  const communityDescription = RandomGenerator.paragraph({ sentences: 8 });

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: communityTitle,
    description: communityDescription,
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  TestValidator.equals(
    "community identifier should echo requested identifier",
    community.identifier,
    communityCreateBody.identifier,
  );
  TestValidator.equals(
    "community title should echo requested title",
    community.title,
    communityCreateBody.title,
  );
  TestValidator.equals(
    "community visibility code should match created visibility level",
    community.visibilityLevel.code,
    visibilityLevel.code,
  );
  TestValidator.predicate(
    "new community should not be archived",
    community.is_archived === false,
  );
  TestValidator.predicate(
    "new community should not be removed",
    community.is_removed === false,
  );

  // 3. Register community moderator and create a tag for the community
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  const tagLabel = RandomGenerator.paragraph({ sentences: 1 });
  const tagSlug = RandomGenerator.alphaNumeric(12);

  const tagCreateBody = {
    label: tagLabel,
    slug: tagSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagCreateBody,
      },
    );
  typia.assert(tag);

  TestValidator.equals(
    "created tag label should echo requested label",
    tag.label,
    tagCreateBody.label,
  );

  // 4. Call overview anonymously and validate landing metadata
  const anonymousConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const overview: ICommunityPlatformCommunityOverview =
    await api.functional.communityPlatform.communities.overview.at(
      anonymousConnection,
      { communityIdentifier: community.identifier },
    );
  typia.assert(overview);

  TestValidator.equals(
    "overview identifier should match community identifier",
    overview.identifier,
    community.identifier,
  );
  TestValidator.equals(
    "overview title should match community title",
    overview.title,
    community.title,
  );
  TestValidator.equals(
    "overview visibility level code should match community visibility code",
    overview.visibility_level.code,
    community.visibilityLevel.code,
  );
  TestValidator.predicate(
    "overview member_count should be non-negative",
    overview.member_count >= 0,
  );
  TestValidator.predicate(
    "overview subscriber_count should be non-negative",
    overview.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "overview should not be archived for fresh community",
    overview.is_archived === false,
  );
  TestValidator.predicate(
    "overview should not be removed for fresh community",
    overview.is_removed === false,
  );

  TestValidator.predicate(
    "overview should include at least one tag summary",
    overview.tags.length >= 1,
  );

  const hasActiveTag = overview.tags.some((summary) => summary.is_active);
  TestValidator.predicate(
    "overview tags should contain at least one active tag",
    hasActiveTag,
  );
}
