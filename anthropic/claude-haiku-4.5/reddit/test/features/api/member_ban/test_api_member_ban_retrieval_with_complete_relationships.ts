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

export async function test_api_member_ban_retrieval_with_complete_relationships(
  connection: api.IConnection,
) {
  // Step 1: Moderator authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(8) + "Pass123!";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphabets(8).toLowerCase(),
      password: moderatorPassword,
      href: "https://test.example.com/auth/moderator",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create member for ban
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(8) + "Pass123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8).toLowerCase(),
      password: memberPassword,
      href: "https://test.example.com/auth/member",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Administrator authentication for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(8) + "Pass123!";
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8).toLowerCase(),
        name: RandomGenerator.name(2),
        href: "https://test.example.com/auth/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 4: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Login as member to create community and post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://test.example.com/auth/member/login",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 6: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 7: Create post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 8: Moderator login and create report decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://test.example.com/auth/moderator/login",
      referrer: "https://test.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 9: Create moderation decision
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "ban_user",
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 10: Create member ban
  const banReason = RandomGenerator.content({ paragraphs: 1 }).substring(
    0,
    100,
  );
  const ban =
    await api.functional.communityPlatform.moderator.memberBans.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          ban_reason:
            banReason.length < 50
              ? banReason +
                " " +
                RandomGenerator.alphabets(50 - banReason.length)
              : banReason,
          appeal_eligible_at: new Date(
            Date.now() + 365 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberBan.ICreate,
      },
    );
  typia.assert(ban);

  // Step 11: Retrieve ban by ID and verify complete relationships
  const retrievedBan =
    await api.functional.communityPlatform.moderator.memberBans.at(connection, {
      banId: ban.id,
    });
  typia.assert(retrievedBan);

  // Verify ban structure and IDs
  TestValidator.equals("ban id matches", retrievedBan.id, ban.id);
  TestValidator.equals(
    "ban member id matches",
    retrievedBan.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "ban decision id matches",
    retrievedBan.community_platform_report_decision_id,
    decision.id,
  );

  // Verify member summary is populated
  TestValidator.predicate(
    "member relationship is populated",
    retrievedBan.member !== undefined && retrievedBan.member !== null,
  );
  if (retrievedBan.member) {
    TestValidator.equals(
      "member id in summary",
      retrievedBan.member.id,
      member.id,
    );
    TestValidator.predicate(
      "member username exists and valid",
      typeof retrievedBan.member.username === "string" &&
        retrievedBan.member.username.length > 0,
    );
    TestValidator.predicate(
      "member email format valid",
      typeof retrievedBan.member.email === "string" &&
        retrievedBan.member.email.includes("@"),
    );
    TestValidator.predicate(
      "member karma score is non-negative",
      typeof retrievedBan.member.karma_score === "number" &&
        retrievedBan.member.karma_score >= 0,
    );
    TestValidator.predicate(
      "member account status is valid enum",
      ["active", "suspended", "pending_deletion", "deleted"].includes(
        retrievedBan.member.account_status,
      ),
    );
    TestValidator.predicate(
      "member email_verified is boolean",
      typeof retrievedBan.member.email_verified === "boolean",
    );
    TestValidator.predicate(
      "member created_at is ISO 8601 datetime",
      typeof retrievedBan.member.created_at === "string" &&
        retrievedBan.member.created_at.includes("T"),
    );
  }

  // Verify decision summary is populated
  TestValidator.predicate(
    "decision relationship is populated",
    retrievedBan.decision !== undefined && retrievedBan.decision !== null,
  );
  if (retrievedBan.decision) {
    TestValidator.equals(
      "decision id in summary",
      retrievedBan.decision.id,
      decision.id,
    );
    TestValidator.predicate(
      "decision action_type is valid enum",
      [
        "no_action",
        "remove_content",
        "issue_warning",
        "suspend_user",
        "ban_user",
        "escalate",
      ].includes(retrievedBan.decision.action_type),
    );
    TestValidator.predicate(
      "decision reason minimum length",
      typeof retrievedBan.decision.reason === "string" &&
        retrievedBan.decision.reason.length >= 10,
    );
    TestValidator.predicate(
      "decision moderator_username exists",
      typeof retrievedBan.decision.moderator_username === "string" &&
        retrievedBan.decision.moderator_username.length > 0,
    );
    TestValidator.predicate(
      "decision created_at is ISO 8601 datetime",
      typeof retrievedBan.decision.created_at === "string" &&
        retrievedBan.decision.created_at.includes("T"),
    );
  }

  // Verify ban-specific fields
  TestValidator.predicate(
    "ban_reason minimum length",
    typeof retrievedBan.ban_reason === "string" &&
      retrievedBan.ban_reason.length >= 50,
  );
  TestValidator.predicate(
    "banned_at is ISO 8601 datetime",
    typeof retrievedBan.banned_at === "string" &&
      retrievedBan.banned_at.includes("T"),
  );

  // Verify optional appeal_eligible_at field
  TestValidator.predicate(
    "appeal_eligible_at is null or ISO 8601 datetime",
    retrievedBan.appeal_eligible_at === null ||
      retrievedBan.appeal_eligible_at === undefined ||
      (typeof retrievedBan.appeal_eligible_at === "string" &&
        retrievedBan.appeal_eligible_at.includes("T")),
  );

  // Verify timestamps
  TestValidator.predicate(
    "created_at is ISO 8601 datetime",
    typeof retrievedBan.created_at === "string" &&
      retrievedBan.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at is ISO 8601 datetime",
    typeof retrievedBan.updated_at === "string" &&
      retrievedBan.updated_at.includes("T"),
  );

  // Verify deleted_at is properly handled
  TestValidator.predicate(
    "deleted_at is null or ISO 8601 datetime",
    retrievedBan.deleted_at === null ||
      retrievedBan.deleted_at === undefined ||
      (typeof retrievedBan.deleted_at === "string" &&
        retrievedBan.deleted_at.includes("T")),
  );

  // Verify no circular reference issues by checking nested objects are complete
  if (retrievedBan.member && retrievedBan.decision) {
    TestValidator.predicate(
      "nested relationships provide complete context",
      retrievedBan.member.id !== undefined &&
        retrievedBan.member.username !== undefined &&
        retrievedBan.decision.id !== undefined &&
        retrievedBan.decision.moderator_username !== undefined &&
        retrievedBan.decision.action_type !== undefined,
    );
  }
}
