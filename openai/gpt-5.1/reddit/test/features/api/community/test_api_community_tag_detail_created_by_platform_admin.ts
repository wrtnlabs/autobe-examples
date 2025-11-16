import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityTag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityTag";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a community tag created by a platform administrator can be
 * retrieved via the public tag detail endpoint.
 *
 * Business flow:
 *
 * 1. PlatformAdmin joins and becomes authenticated.
 * 2. PlatformAdmin creates a community visibility level.
 * 3. MemberUser joins and becomes authenticated.
 * 4. MemberUser creates a community that references the created visibility level.
 * 5. PlatformAdmin logs back in and creates a tag for that community.
 * 6. A public/guest caller (no Authorization header) fetches the tag detail.
 * 7. Validate that returned tag metadata matches the created tag and that only the
 *    public ICommunityPlatformCommunityTag fields are exposed.
 */
export async function test_api_community_tag_detail_created_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. PlatformAdmin joins
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: platformAdminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. PlatformAdmin creates a visibility level
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Visibility Level",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. MemberUser joins (this call will switch Authorization header)
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: memberUserEmail,
    password: RandomGenerator.alphaNumeric(14),
    ip: "127.0.0.1",
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. MemberUser creates a community referencing the created visibility level
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(10)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
    "community identifier should match",
    community.identifier,
    communityIdentifier,
  );
  TestValidator.equals(
    "community visibility level code should match",
    community.visibilityLevel.code,
    visibilityCode,
  );

  // 5. PlatformAdmin logs back in to create tag for the community
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminReauthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminReauthorized);

  // 6. PlatformAdmin creates a tag for the community
  const tagLabel = "platform-admin-tag";
  const tagSlug = `platform-admin-${RandomGenerator.alphaNumeric(6)}`;
  const tagDescription = RandomGenerator.paragraph({ sentences: 6 });
  const tagOrder: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();

  const tagCreateBody = {
    label: tagLabel,
    slug: tagSlug,
    description: tagDescription,
    isVisible: true,
    order: tagOrder,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const createdTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier,
        body: tagCreateBody,
      },
    );
  typia.assert(createdTag);

  TestValidator.equals(
    "created tag label should match",
    createdTag.label,
    tagLabel,
  );
  TestValidator.equals(
    "created tag slug should match",
    createdTag.slug,
    tagSlug,
  );
  TestValidator.equals(
    "created tag description should match",
    createdTag.description,
    tagDescription,
  );
  TestValidator.equals(
    "created tag isVisible should be true",
    createdTag.isVisible,
    true,
  );
  TestValidator.equals(
    "created tag order should match",
    createdTag.order,
    tagOrder,
  );

  // 7. Public/guest caller: clone connection with empty headers (never touch again)
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const fetchedTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communities.tags.at(
      guestConnection,
      {
        communityIdentifier,
        tagId: createdTag.id,
      },
    );
  typia.assert(fetchedTag);

  // 8. Assertions on the fetched tag
  TestValidator.equals(
    "fetched tag id should match created tag id",
    fetchedTag.id,
    createdTag.id,
  );
  TestValidator.equals(
    "fetched tag label should match created tag label",
    fetchedTag.label,
    createdTag.label,
  );
  TestValidator.equals(
    "fetched tag slug should match created tag slug",
    fetchedTag.slug,
    createdTag.slug,
  );
  TestValidator.equals(
    "fetched tag description should match created tag description",
    fetchedTag.description,
    createdTag.description,
  );
  TestValidator.equals(
    "fetched tag visibility should match created tag visibility",
    fetchedTag.isVisible,
    createdTag.isVisible,
  );
  TestValidator.equals(
    "fetched tag order should match created tag order",
    fetchedTag.order,
    createdTag.order,
  );

  TestValidator.equals(
    "fetched tag createdAt should match created tag createdAt",
    fetchedTag.createdAt,
    createdTag.createdAt,
  );
  TestValidator.equals(
    "fetched tag updatedAt should match created tag updatedAt",
    fetchedTag.updatedAt,
    createdTag.updatedAt,
  );
  TestValidator.equals(
    "fetched tag deletedAt should match created tag deletedAt (likely undefined)",
    fetchedTag.deletedAt,
    createdTag.deletedAt,
  );

  // No internal community identifiers are exposed beyond tag fields, so
  // scoping is validated by using the same communityIdentifier and tagId.
}
