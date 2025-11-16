import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_moderator_tier_demotion_by_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/join",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for community creator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "MemberPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 4: Create community with the creator member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create another member to be appointed as senior moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorMember = await api.functional.auth.member.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "MemberPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(moderatorMember);

  // Step 6: Appoint the member as senior moderator in the community
  const seniorModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderatorMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModerator);
  TestValidator.equals(
    "moderator tier should be senior before demotion",
    seniorModerator.moderator_tier,
    "senior",
  );

  // Step 7: Use administrator to demote the senior moderator to junior tier
  const demotionReason = "Performance issues and reduced engagement";
  const demotedModerator =
    await api.functional.communityPlatform.administrator.communities.moderators.update(
      connection,
      {
        communityId: community.id,
        moderatorId: seniorModerator.id,
        body: {
          moderator_tier: "junior",
          reason: demotionReason,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(demotedModerator);

  // Step 8: Validate the demotion
  TestValidator.equals(
    "moderator tier should be junior after demotion",
    demotedModerator.moderator_tier,
    "junior",
  );

  TestValidator.equals(
    "moderator should still be in community after demotion",
    demotedModerator.community.id,
    community.id,
  );

  TestValidator.equals(
    "moderator member should be unchanged",
    demotedModerator.member.id,
    moderatorMember.id,
  );

  TestValidator.predicate(
    "moderator should remain active (removed_at should be null)",
    demotedModerator.removed_at === null,
  );
}
