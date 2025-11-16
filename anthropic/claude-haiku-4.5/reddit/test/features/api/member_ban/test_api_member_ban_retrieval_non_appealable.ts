import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

/**
 * Test retrieval of a member ban record where the ban is permanent and
 * non-appealable.
 *
 * This test validates the retrieval of a ban created with appeal_eligible_at
 * set to null, indicating a permanent ban that cannot be appealed regardless of
 * time passage. The test verifies that the appeal_eligible_at field is properly
 * represented as null in the response, clearly distinguishing permanent bans
 * from appealable bans. This is important for the appeals system to correctly
 * identify which bans allow appeal requests and which are final.
 *
 * The test flow:
 *
 * 1. Create an administrator account for ban management
 * 2. Create a member account to be permanently banned
 * 3. Create a category for community organization
 * 4. Create a community with violating content
 * 5. Create a post for violation report
 * 6. Create a moderator for ban decision
 * 7. Create a moderation decision authorizing the ban
 * 8. Create a permanent non-appealable ban with appeal_eligible_at as null
 * 9. Retrieve the ban and confirm non-appealable status
 */
export async function test_api_member_ban_retrieval_non_appealable(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://platform.example.com/admin/register",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create member account to be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: memberPassword,
        href: "https://platform.example.com/register",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create category (switch to admin context for category creation)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://platform.example.com/admin/login",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community (switch back to member context)
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://platform.example.com/login",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post with violating content
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph(),
        content_text: RandomGenerator.content(),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 6: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: moderatorPassword,
        href: "https://platform.example.com/moderator/register",
        referrer: "https://platform.example.com/",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 7: Generate a report ID for decision creation
  // In a real scenario, a report would be created by another member
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 8: Switch to moderator to create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://platform.example.com/moderator/login",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId,
        body: {
          action_type: "ban_user",
          reason:
            "User violated platform policies repeatedly with severe content violations requiring permanent removal from the platform",
          internal_notes:
            "Pattern of violations detected. Permanent ban issued with no appeal window.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 9: Switch to admin to create the permanent ban without appeal eligibility
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "https://platform.example.com/admin/login",
      referrer: "https://platform.example.com/",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const banCreate = {
    community_platform_member_id: member.id,
    community_platform_report_decision_id: decision.id,
    ban_reason:
      "Permanent ban issued for severe and repeated violations of community standards including harassment, hate speech, and threats toward other members. This ban is non-appealable and effective immediately.",
    appeal_eligible_at: null,
  } satisfies ICommunityPlatformMemberBan.ICreate;

  const ban: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.administrator.memberBans.create(
      connection,
      {
        body: banCreate,
      },
    );
  typia.assert(ban);

  // Step 10: Retrieve the ban and verify non-appealable status
  const retrievedBan: ICommunityPlatformMemberBan =
    await api.functional.communityPlatform.administrator.memberBans.at(
      connection,
      {
        banId: ban.id,
      },
    );
  typia.assert(retrievedBan);

  // Verify the ban is non-appealable
  TestValidator.equals(
    "ban appeal_eligible_at should be null for non-appealable ban",
    retrievedBan.appeal_eligible_at,
    null,
  );

  // Verify the ban contains the expected information
  TestValidator.equals(
    "banned member ID matches",
    retrievedBan.community_platform_member_id,
    member.id,
  );

  TestValidator.equals(
    "ban reason is preserved",
    retrievedBan.ban_reason,
    banCreate.ban_reason,
  );

  TestValidator.predicate(
    "ban timestamp is set",
    retrievedBan.banned_at !== undefined && retrievedBan.banned_at !== null,
  );

  TestValidator.predicate(
    "non-appealable status confirmed",
    retrievedBan.appeal_eligible_at === null,
  );
}
