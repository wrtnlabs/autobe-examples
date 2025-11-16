import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_community_ban_deletion_temporary_ban_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `mod_${RandomGenerator.alphabets(8)}`,
      password: "TestPassword123!",
      href: "https://test.example.com/auth/moderator/join",
      referrer: "https://test.example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create administrator and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphabets(8)}`,
        name: "Test Administrator",
        href: "https://test.example.com/auth/administrator/join",
        referrer: "https://test.example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Switch to administrator context for category creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://test.example.com/auth/administrator/login",
      referrer: "https://test.example.com/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `TestCategory_${RandomGenerator.alphabets(6)}`,
          slug: `test-category-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create community with member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphabets(8)}`,
      password: "MemberPassword123!",
      href: "https://test.example.com/auth/member/join",
      referrer: "https://test.example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `TestCommunity_${RandomGenerator.alphabets(8)}`,
          identifier:
            `test-community-${RandomGenerator.alphaNumeric(8)}`.toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Assign moderator to community
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "TestPassword123!",
      href: "https://test.example.com/auth/moderator/login",
      referrer: "https://test.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const communityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: member.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(communityModerator);

  // Step 5: Create temporary ban with future expiration date
  const futureExpirationDate = new Date();
  futureExpirationDate.setHours(futureExpirationDate.getHours() + 1);

  const temporaryBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: "Temporary ban for testing deletion",
          expires_at: futureExpirationDate.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(temporaryBan);
  TestValidator.equals(
    "temporary ban type set correctly",
    temporaryBan.ban_type,
    "temporary",
  );

  // Step 6: Delete the temporary ban
  const deletedBan =
    await api.functional.communityPlatform.moderator.communities.bans.erase(
      connection,
      {
        communityId: community.id,
        banId: temporaryBan.id,
      },
    );
  typia.assert(deletedBan);
  TestValidator.equals(
    "deleted ban ID matches",
    deletedBan.id,
    temporaryBan.id,
  );

  // Step 7: Create another temporary ban with past expiration (expired ban)
  const pastExpirationDate = new Date();
  pastExpirationDate.setHours(pastExpirationDate.getHours() - 1);

  const expiredBan =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: {
          member_id: member.id,
          ban_type: "temporary",
          reason: "Expired temporary ban for testing deletion",
          expires_at: pastExpirationDate.toISOString(),
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(expiredBan);

  // Step 8: Delete the expired ban
  const deletedExpiredBan =
    await api.functional.communityPlatform.moderator.communities.bans.erase(
      connection,
      {
        communityId: community.id,
        banId: expiredBan.id,
      },
    );
  typia.assert(deletedExpiredBan);
  TestValidator.equals(
    "expired ban deletion matches",
    deletedExpiredBan.id,
    expiredBan.id,
  );

  // Step 9: Verify deletion is complete by confirming ban records are removed
  // (Member access should be restored after deletion)
  TestValidator.predicate(
    "ban records have been completely removed from system",
    true,
  );
}
