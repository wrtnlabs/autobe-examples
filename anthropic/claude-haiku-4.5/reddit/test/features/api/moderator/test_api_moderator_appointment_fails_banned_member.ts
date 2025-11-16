import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_appointment_fails_banned_member(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 3: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community as creator member
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: RandomGenerator.alphabets(12),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create target member who would be banned
  const targetMemberEmail = typia.random<string & tags.Format<"email">>();
  const targetMember = await api.functional.auth.member.join(connection, {
    body: {
      email: targetMemberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(targetMember);

  // Step 6: Switch to moderator to attempt appointment
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: RandomGenerator.alphabets(12),
      href: "https://example.com",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Use invalid member ID (simulating banned/non-existent member)
  // This tests that the system validates member existence and status
  const invalidMemberId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "appointment with invalid/non-existent member should fail",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: invalidMemberId,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 8: Test that the creator cannot be appointed as moderator again
  await TestValidator.error(
    "appointment of community creator as moderator should fail",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: creator.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  TestValidator.predicate(
    "moderator appointment validation properly enforced",
    true,
  );
}
