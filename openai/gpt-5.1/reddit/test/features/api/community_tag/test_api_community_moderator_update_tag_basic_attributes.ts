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
 * Validate that a community moderator can update mutable attributes of a
 * community tag within a community they moderate.
 *
 * Business flow:
 *
 * 1. Platform admin joins to gain rights to create a visibility level.
 * 2. Platform admin creates a community visibility level used when creating the
 *    community.
 * 3. Member user joins to act as community creator.
 * 4. Member user creates a community using the created visibility level code.
 * 5. Community moderator joins.
 * 6. As community moderator, create an initial tag in the community.
 * 7. Capture original tag attributes (id and timestamps).
 * 8. As same moderator, update the tag via PUT with a payload changing label,
 *    slug, description, isVisible, and order.
 * 9. Verify that:
 *
 *    - Response type is valid ICommunityPlatformCommunityTag.
 *    - Id remains unchanged.
 *    - CreatedAt remains unchanged.
 *    - UpdatedAt is not earlier than the original updatedAt.
 *    - Label, slug, description, isVisible, and order reflect updated values.
 *
 * Since there is no dedicated GET endpoint for a single tag in the SDK list,
 * the test relies on the PUT response as the source of truth after update.
 */
export async function test_api_community_moderator_update_tag_basic_attributes(
  connection: api.IConnection,
) {
  // 1. Platform admin joins
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(12),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Platform admin creates a visibility level
  const visibilityCode = `vis-${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: `Visibility ${RandomGenerator.name(1)}`,
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
  TestValidator.equals(
    "created visibility level code must match input",
    visibilityLevel.code,
    visibilityCode,
  );

  // 3. Member user joins
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "https://app.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://app.example.com/home" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member user creates a community
  const communityIdentifier = `community-${RandomGenerator.alphabets(8)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: `Community ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({ sentences: 8 }),
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
    "created community identifier must match input",
    community.identifier,
    communityIdentifier,
  );

  // 5. Community moderator joins
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com` as string &
      tags.Format<"email">,
    password: RandomGenerator.alphabets(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://mod.example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. As community moderator, create an initial tag
  const initialTagCreateBody = {
    label: `Tag ${RandomGenerator.name(1)}`,
    slug: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isVisible: true,
    order: 1,
  } satisfies ICommunityPlatformCommunityTag.ICreate;

  const originalTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: initialTagCreateBody,
      },
    );
  typia.assert(originalTag);

  // 7. Capture original tag attributes
  const originalId = originalTag.id;
  const originalCreatedAt = originalTag.createdAt;
  const originalUpdatedAt = originalTag.updatedAt;

  // 8. Update the tag with new attributes
  const updatedLabel = `Updated ${RandomGenerator.name(1)}`;
  const updatedSlug = `${initialTagCreateBody.slug}-updated`;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updatedIsVisible = !originalTag.isVisible;
  const updatedOrder = (originalTag.order ?? 0) + 5;

  const updateBody = {
    label: updatedLabel,
    slug: updatedSlug,
    description: updatedDescription,
    isVisible: updatedIsVisible,
    order: updatedOrder,
  } satisfies ICommunityPlatformCommunityTag.IUpdate;

  const updatedTag: ICommunityPlatformCommunityTag =
    await api.functional.communityPlatform.communityModerator.communities.tags.update(
      connection,
      {
        communityIdentifier: community.identifier,
        tagId: originalTag.id,
        body: updateBody,
      },
    );
  typia.assert(updatedTag);

  // 9. Assertions on updated tag
  TestValidator.equals(
    "tag id remains unchanged after update",
    updatedTag.id,
    originalId,
  );
  TestValidator.equals(
    "createdAt remains unchanged after update",
    updatedTag.createdAt,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updatedAt should not be earlier than original updatedAt",
    new Date(updatedTag.updatedAt).getTime() >=
      new Date(originalUpdatedAt).getTime(),
  );

  TestValidator.equals(
    "label reflects updated value",
    updatedTag.label,
    updatedLabel,
  );
  TestValidator.equals(
    "slug reflects updated value",
    updatedTag.slug,
    updatedSlug,
  );
  TestValidator.equals(
    "description reflects updated value",
    updatedTag.description,
    updatedDescription,
  );
  TestValidator.equals(
    "isVisible reflects updated value",
    updatedTag.isVisible,
    updatedIsVisible,
  );
  TestValidator.equals(
    "order reflects updated value",
    updatedTag.order,
    updatedOrder,
  );
}
