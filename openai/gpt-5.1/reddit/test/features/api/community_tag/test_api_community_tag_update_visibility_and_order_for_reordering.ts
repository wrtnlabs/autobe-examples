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
 * Validate that a platform administrator can update community tag visibility
 * and order.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) to obtain admin auth context.
 * 2. Create a community visibility level as platformAdmin.
 * 3. Register a memberUser, then create a community referencing the created
 *    visibility level.
 * 4. As platformAdmin, create multiple tags in that community.
 * 5. Update one tag’s isVisible and order via the PUT endpoint.
 * 6. Assert that id and createdAt are preserved, isVisible and order are updated,
 *    and updatedAt has changed.
 */
export async function test_api_community_tag_update_visibility_and_order_for_reordering(
  connection: api.IConnection,
) {
  // 1. Register platform admin (implicit login via join)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    ip: RandomGenerator.alphaNumeric(8),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create community visibility level as platformAdmin
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(6)}`;
  const visibilityBody = {
    code: visibilityCode,
    name: `Public ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register memberUser and create a community using the visibility level
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(1)}`,
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityCode,
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
    "created community identifier should match requested identifier",
    community.identifier,
    communityIdentifier,
  );

  // 4. Switch back to platformAdmin explicitly via login (explicit actor swap)
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 5. Create multiple tags in the community
  const baseOrder = 10 as number & tags.Type<"int32">;

  const tag1Body = {
    label: `Tag ${RandomGenerator.name(1)}`,
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: baseOrder,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tag2Body = {
    label: `Tag ${RandomGenerator.name(1)}`,
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: (baseOrder + 10) as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tag3Body = {
    label: `Tag ${RandomGenerator.name(1)}`,
    slug: undefined,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isVisible: true,
    order: (baseOrder + 20) as number & tags.Type<"int32">,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const tag1: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier,
        body: tag1Body,
      },
    );
  typia.assert(tag1);

  const tag2: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier,
        body: tag2Body,
      },
    );
  typia.assert(tag2);

  const tag3: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier,
        body: tag3Body,
      },
    );
  typia.assert(tag3);

  // 6. Update tag2: hide it and move it earlier in order
  const newOrder = (baseOrder - 5) as number & tags.Type<"int32">;
  const updateBody = {
    isVisible: false,
    order: newOrder,
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  const updatedTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.update(
      connection,
      {
        communityIdentifier,
        tagId: tag2.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTag);

  // 7. Assertions: id and createdAt preserved, isVisible/order updated, updatedAt changed
  TestValidator.equals(
    "updated tag should keep the same id",
    updatedTag.id,
    tag2.id,
  );
  TestValidator.equals(
    "updated tag should preserve createdAt",
    updatedTag.createdAt,
    tag2.createdAt,
  );
  TestValidator.equals(
    "updated tag isVisible should be updated to false",
    updatedTag.isVisible,
    false,
  );
  TestValidator.equals(
    "updated tag order should be updated to new value",
    updatedTag.order,
    newOrder,
  );
  TestValidator.notEquals(
    "updatedAt should change after update",
    updatedTag.updatedAt,
    tag2.updatedAt,
  );
}
