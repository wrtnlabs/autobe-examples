import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_moderator_reactivation_from_soft_delete(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://localhost:3000/admin/join",
        referrer: "https://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category for community
  const categoryBody = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryBody },
    );
  typia.assert(category);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: "https://localhost:3000/join",
        referrer: "https://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create community
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // Step 5: Appoint member as moderator
  const moderatorBody = {
    memberId: member.id,
    tier: "senior" as const,
  } satisfies ICommunityPlatformCommunityModerator.ICreate;
  const moderator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      { communityId: community.id, body: moderatorBody },
    );
  typia.assert(moderator);
  TestValidator.predicate(
    "moderator is initially active",
    moderator.removed_at === null,
  );

  // Step 6: Remove moderator (soft-delete by administrator)
  const removalReason = "Performance issues";
  const removedModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.administrator.communities.moderators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        body: {
          removed_at: new Date().toISOString(),
          reason: removalReason,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(removedModerator);
  TestValidator.predicate(
    "moderator is removed after soft-delete",
    removedModerator.removed_at !== null,
  );

  // Step 7: Reactivate moderator by clearing removed_at
  const reactivationReason = "appeal approved";
  const reactivatedModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.administrator.communities.moderators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: moderator.id,
        body: {
          removed_at: null,
          reason: reactivationReason,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(reactivatedModerator);

  // Step 8: Validate moderator is reactivated
  TestValidator.equals(
    "reactivated moderator has removed_at set to null",
    reactivatedModerator.removed_at,
    null,
  );
  TestValidator.equals(
    "moderator tier is preserved after reactivation",
    reactivatedModerator.moderator_tier,
    moderator.moderator_tier,
  );
  TestValidator.equals(
    "community reference is preserved",
    reactivatedModerator.community.id,
    community.id,
  );
  TestValidator.equals(
    "member reference is preserved",
    reactivatedModerator.member.id,
    member.id,
  );
}
