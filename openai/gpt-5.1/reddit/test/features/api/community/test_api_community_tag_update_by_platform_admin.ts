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
 * Verify that a platform administrator can update an existing community tag
 * belonging to a real community, and that mutable fields change while immutable
 * identifiers remain stable.
 *
 * Business flow:
 *
 * 1. Register a platform admin (join) and obtain its auth context.
 * 2. As platform admin, create a community visibility level.
 * 3. Register a member user (join) and obtain its auth context.
 * 4. As member user, create a community that references the created visibility
 *    level via its `code`.
 * 5. Switch back to platform admin via login.
 * 6. As platform admin, create an initial tag under the community.
 * 7. As platform admin, update the tag using the PUT endpoint with modified
 *    label/slug/description/isVisible/order.
 * 8. Assert that the response is a valid ICommunityPlatformCommunityTag and that
 *    all updated fields reflect new values while `id` and `createdAt` stay
 *    unchanged.
 * 9. Apply a second update that changes only a subset of fields and assert that
 *    unspecified fields remain as-is.
 */
export async function test_api_community_tag_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register platform admin (join)
  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminAuthorized,
  );

  // 2. As platform admin, create a community visibility level
  const visibilityLevelCreateBody = {
    code: `code-${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Register a member user (join)
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://app.example.com/register",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 4. As member user, create a community referencing the visibility code
  const communityCreateBody = {
    identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  const communityIdentifier: string = community.identifier;

  // 5. Switch back to platform admin via login
  const platformAdminLoginBody = {
    identifier: platformAdminJoinBody.email,
    password: platformAdminJoinBody.password,
    ip: "127.0.0.1",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLoginAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    platformAdminLoginAuthorized,
  );

  // 6. As platform admin, create an initial tag under the community
  const initialTagCreateBody = {
    label: RandomGenerator.name(2),
    slug: `tag-${RandomGenerator.alphaNumeric(6)}`,
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const originalTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.create(
      connection,
      {
        communityIdentifier,
        body: initialTagCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(originalTag);

  const originalId: string = originalTag.id;
  const originalCreatedAt: string = originalTag.createdAt;
  const originalUpdatedAt: string = originalTag.updatedAt;

  // 7. Update the tag with new values
  const updatedLabel: string = RandomGenerator.name(3);
  const updatedSlug: string = `updated-${RandomGenerator.alphaNumeric(6)}`;
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 7,
  });
  const updatedIsVisible: boolean = false;
  const updatedOrder = 5;

  const updateBody = {
    label: updatedLabel,
    slug: updatedSlug,
    description: updatedDescription,
    isVisible: updatedIsVisible,
    order: updatedOrder,
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  const updatedTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.update(
      connection,
      {
        communityIdentifier,
        tagId: originalId,
        body: updateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(updatedTag);

  // 8. Assertions on updated tag
  TestValidator.equals("tag id remains unchanged", updatedTag.id, originalId);
  TestValidator.equals(
    "label updated correctly",
    updatedTag.label,
    updatedLabel,
  );
  TestValidator.equals("slug updated correctly", updatedTag.slug, updatedSlug);
  TestValidator.equals(
    "description updated correctly",
    updatedTag.description,
    updatedDescription,
  );
  TestValidator.equals(
    "visibility flag updated correctly",
    updatedTag.isVisible,
    updatedIsVisible,
  );
  TestValidator.equals(
    "order updated correctly",
    updatedTag.order,
    updatedOrder,
  );

  TestValidator.equals(
    "createdAt remains unchanged after update",
    updatedTag.createdAt,
    originalCreatedAt,
  );

  // updatedAt should be present and not earlier than originalUpdatedAt
  TestValidator.predicate(
    "updatedAt is same or later than originalUpdatedAt",
    () =>
      new Date(updatedTag.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  // 9. Second update: toggle only isVisible and verify others unchanged
  const secondUpdateBody = {
    isVisible: !updatedIsVisible,
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  const secondUpdatedTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.platformAdmin.communities.tags.update(
      connection,
      {
        communityIdentifier,
        tagId: originalId,
        body: secondUpdateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityTag>(secondUpdatedTag);

  TestValidator.equals(
    "second update keeps id stable",
    secondUpdatedTag.id,
    originalId,
  );
  TestValidator.equals(
    "second update retains label",
    secondUpdatedTag.label,
    updatedLabel,
  );
  TestValidator.equals(
    "second update retains slug",
    secondUpdatedTag.slug,
    updatedSlug,
  );
  TestValidator.equals(
    "second update retains description",
    secondUpdatedTag.description,
    updatedDescription,
  );
  TestValidator.equals(
    "second update toggles isVisible only",
    secondUpdatedTag.isVisible,
    !updatedIsVisible,
  );
  TestValidator.equals(
    "second update retains order",
    secondUpdatedTag.order,
    updatedOrder,
  );

  TestValidator.equals(
    "second update keeps createdAt unchanged",
    secondUpdatedTag.createdAt,
    originalCreatedAt,
  );
}
