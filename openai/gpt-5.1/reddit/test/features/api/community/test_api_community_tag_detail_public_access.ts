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

export async function test_api_community_tag_detail_public_access(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (and implicitly authenticates)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.local/register",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdmin);

  // 2. Create a visibility level as platform admin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: "Public Visibility (E2E)",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibility);
  TestValidator.equals(
    "visibility code must match the created payload",
    visibility.code,
    visibilityCode,
  );

  // 3. Member user joins (and authenticates)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.local/register",
    referrer: "https://app.local/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. Create a community as the member user
  const communityIdentifier = `e2e-community-${RandomGenerator.alphaNumeric(8)}`;
  const communityBody = {
    identifier: communityIdentifier,
    title: "E2E Test Community",
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier matches requested identifier",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code matches created level",
    community.visibilityLevel.code,
    visibility.code,
  );

  // 5. Community moderator joins (and authenticates)
  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.console.local/register",
    referrer: "https://mod.console.local/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorAuthorized,
  );

  // 6. Create a tag under the community as the moderator
  const tagLabel = "E2E Public Tag";
  const tagSlug = `e2e-public-tag-${RandomGenerator.alphaNumeric(6)}`;
  const tagDescription = RandomGenerator.paragraph({ sentences: 6 });
  const tagOrder = 10 as number & tags.Type<"int32">;

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
  typia.assert<ICommunityPlatformCommunityTag>(createdTag);

  TestValidator.equals(
    "created tag label must match the payload label",
    createdTag.label,
    tagLabel,
  );
  TestValidator.equals(
    "created tag slug must match the payload slug",
    createdTag.slug,
    tagSlug,
  );
  TestValidator.equals(
    "created tag description must match the payload description",
    createdTag.description,
    tagDescription,
  );
  TestValidator.equals(
    "created tag visibility must be true",
    createdTag.isVisible,
    true,
  );
  TestValidator.equals(
    "created tag order must match",
    createdTag.order,
    tagOrder,
  );

  // 7. Build unauthenticated (guest) connection by clearing headers
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 8. Retrieve the tag publicly via the public endpoint
  const publicTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communities.tags.at(
      guestConnection,
      {
        communityIdentifier: community.identifier,
        tagId: createdTag.id,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(publicTag);

  // 9. Business assertions: ensure the public representation matches
  TestValidator.equals(
    "public tag id must equal created tag id",
    publicTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "public tag label matches created label",
    publicTag.label,
    createdTag.label,
  );
  TestValidator.equals(
    "public tag slug matches created slug",
    publicTag.slug,
    createdTag.slug,
  );
  TestValidator.equals(
    "public tag description matches created description",
    publicTag.description,
    createdTag.description,
  );
  TestValidator.equals(
    "public tag visibility matches created visibility",
    publicTag.isVisible,
    createdTag.isVisible,
  );
  TestValidator.equals(
    "public tag order matches created order",
    publicTag.order,
    createdTag.order,
  );

  // 10. Timestamps sanity checks (createdAt / updatedAt exist and are coherent)
  const createdAtMillis = Date.parse(publicTag.createdAt);
  const updatedAtMillis = Date.parse(publicTag.updatedAt);

  TestValidator.predicate(
    "public tag createdAt must be a valid date-time string",
    !Number.isNaN(createdAtMillis),
  );
  TestValidator.predicate(
    "public tag updatedAt must be a valid date-time string",
    !Number.isNaN(updatedAtMillis),
  );
  TestValidator.predicate(
    "public tag updatedAt must be greater than or equal to createdAt",
    updatedAtMillis >= createdAtMillis,
  );
}
