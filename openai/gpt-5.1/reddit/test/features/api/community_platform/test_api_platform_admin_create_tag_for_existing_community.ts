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
 * Validate that a platform administrator can create a tag for an existing
 * community.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) to obtain a platformAdmin-authenticated
 *    connection.
 * 2. As platformAdmin, create a community visibility level to get a valid
 *    visibilityLevelCode.
 * 3. Register a memberUser (join) to obtain a memberUser-authenticated connection.
 * 4. As memberUser, create a community using the visibilityLevelCode and capture
 *    its identifier.
 * 5. Log back in as platformAdmin to ensure we have platformAdmin authorization.
 * 6. As platformAdmin, create a tag for the created community.
 * 7. Assert that the tag response conforms to ICommunityPlatformCommunityTag and
 *    that key fields match the request.
 */
export async function test_api_platform_admin_create_tag_for_existing_community(
  connection: api.IConnection,
) {
  // 1. Register a platform admin via /auth/platformAdmin/join
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.console.local/register",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. As platformAdmin, create a visibility level
  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);
  TestValidator.equals(
    "visibility code should match request",
    visibilityLevel.code,
    visibilityCreateBody.code,
  );

  // 3. Register a memberUser via /auth/memberUser/join (this also authenticates as memberUser)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://app.frontend.local/join",
    referrer: "https://app.frontend.local/",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. As memberUser, create a community using visibilityLevel.code
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
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
  typia.assert<ICommunityPlatformCommunity>(community);
  TestValidator.equals(
    "community identifier should match create body",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 5. Log back in as platformAdmin to ensure platformAdmin authorization
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.console.local/login",
    referrer: "https://landing.local/",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoginAuthorized,
  );

  // 6. As platformAdmin, create a tag for the created community
  const tagLabel = RandomGenerator.paragraph({ sentences: 2 });
  const tagSlug = RandomGenerator.paragraph({ sentences: 1 })
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const tagOrder = 1 as number & tags.Type<"int32">;

  const tagCreateBody = {
    label: tagLabel,
    slug: tagSlug,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: tagOrder,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const createdTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: tagCreateBody,
      },
    );

  // 7. Validate created tag
  typia.assert<ICommunityPlatformCommunityTag>(createdTag);

  TestValidator.predicate(
    "created tag id should be a non-empty string",
    createdTag.id.length > 0,
  );

  TestValidator.equals(
    "created tag label should match request",
    createdTag.label,
    tagCreateBody.label,
  );

  if (tagCreateBody.slug !== undefined) {
    TestValidator.equals(
      "created tag slug should match request when provided",
      createdTag.slug,
      tagCreateBody.slug,
    );
  }

  TestValidator.equals(
    "created tag description should match request",
    createdTag.description ?? null,
    tagCreateBody.description ?? null,
  );

  TestValidator.equals(
    "created tag isVisible should match request (default true)",
    createdTag.isVisible,
    tagCreateBody.isVisible ?? true,
  );

  TestValidator.equals(
    "created tag order should match request when provided",
    createdTag.order ?? null,
    tagCreateBody.order ?? null,
  );

  TestValidator.predicate(
    "createdAt should be a non-empty ISO timestamp",
    createdTag.createdAt.length > 0,
  );

  TestValidator.predicate(
    "updatedAt should be a non-empty ISO timestamp",
    createdTag.updatedAt.length > 0,
  );
}
