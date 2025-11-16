import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that non-moderator members cannot create bans in a community.
 *
 * This test validates authorization boundaries for the ban creation endpoint by
 * verifying that only moderators and administrators can issue bans. A regular
 * member attempting to create a ban in a community where they have no moderator
 * status should receive a 403 Forbidden error.
 *
 * The test workflow:
 *
 * 1. Create administrator account for system setup
 * 2. Create a community category for classification
 * 3. Create a community with a member account (member becomes creator)
 * 4. Create a non-moderator member account
 * 5. Create a target member account to be banned
 * 6. Switch to non-moderator member authentication
 * 7. Attempt to create a ban as the non-moderator member
 * 8. Verify 403 Forbidden error is returned, confirming authorization enforcement
 */
export async function test_api_community_ban_creation_unauthorized_non_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for system setup
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: "AdminPass123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://api.example.com/auth/admin/join",
        referrer: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a community category for classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Technology and programming discussions",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create a community with a member account (member becomes creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "CreatorPass123!",
        href: "https://api.example.com/auth/member/join",
        referrer: "https://example.com/join",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  const communityData = {
    name: "Tech Discussions",
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: "A community for tech discussions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 4: Create a non-moderator member account
  const nonModeratorEmail = typia.random<string & tags.Format<"email">>();
  const nonModerator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: nonModeratorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "NonModPass123!",
        href: "https://api.example.com/auth/member/join",
        referrer: "https://example.com/join",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(nonModerator);

  // Step 5: Create a target member account to be banned
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: targetEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "TargetPass123!",
        href: "https://api.example.com/auth/member/join",
        referrer: "https://example.com/join",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(targetMember);

  // Step 6: Switch to non-moderator member authentication
  await api.functional.auth.member.login(connection, {
    body: {
      email: nonModeratorEmail,
      password: "NonModPass123!",
      href: "https://api.example.com/auth/member/login",
      referrer: "https://example.com/login",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 7: Attempt to create a ban as the non-moderator member
  // Step 8: Verify 403 Forbidden error is returned
  await TestValidator.error(
    "non-moderator member cannot create bans",
    async () => {
      await api.functional.communityPlatform.moderator.communities.bans.create(
        connection,
        {
          communityId: community.id,
          body: {
            member_id: targetMember.id,
            ban_type: "temporary" as const,
            reason: "Test ban reason",
            expires_at: new Date(
              Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
          } satisfies ICommunityPlatformCommunityBan.ICreate,
        },
      );
    },
  );
}
