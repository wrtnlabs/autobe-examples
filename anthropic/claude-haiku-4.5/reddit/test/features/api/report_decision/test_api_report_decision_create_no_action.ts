import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_report_decision_create_no_action(
  connection: api.IConnection,
) {
  // Step 1: Create test actors - administrator, moderator, member, and poster
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = `admin-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(8)}`,
        name: "Test Administrator",
        href: "https://example.com",
        referrer: "",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorEmail = `moderator-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
        href: "https://example.com",
        referrer: "",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail = `member-${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        username: `member_${RandomGenerator.alphaNumeric(8)}`,
        href: "https://example.com",
        referrer: "",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(8)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Switch to member and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com",
      referrer: "",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(8)}`,
          identifier: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: "A test community for moderation testing",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post in the community (content that will be reported)
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Legitimate Discussion Post",
        content_text:
          "This is a legitimate discussion about technology trends and innovations in the industry.",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create a report ID that represents a submitted report
  // In a real scenario, this would be created through a report endpoint
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 6: Switch to moderator and create a no_action decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com",
      referrer: "",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decisionReason =
    "After careful review, this post complies with community standards. The discussion is constructive and does not violate any policies regarding harassment, misinformation, or hate speech.";
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "no_action",
          reason: decisionReason,
          internal_notes:
            "Post discusses technology trends without harassment or misinformation. Content is relevant to community scope.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 7: Validate the decision was created correctly with no_action approval
  TestValidator.equals(
    "decision action_type should be no_action",
    decision.action_type,
    "no_action",
  );

  TestValidator.predicate(
    "decision reason should have minimum 10 characters",
    decision.reason.length >= 10,
  );

  TestValidator.equals(
    "decision reason should match provided explanation",
    decision.reason,
    decisionReason,
  );

  TestValidator.predicate(
    "internal notes should be recorded",
    decision.internal_notes !== null && decision.internal_notes !== undefined,
  );

  TestValidator.predicate(
    "decision moderator should be set",
    decision.moderator !== null && decision.moderator !== undefined,
  );

  TestValidator.predicate(
    "decision report should be linked",
    decision.report !== null && decision.report !== undefined,
  );

  TestValidator.predicate(
    "no suspension duration should be set for no_action decision",
    decision.suspension_duration_days === null ||
      decision.suspension_duration_days === undefined,
  );

  TestValidator.predicate(
    "decision should have creation timestamp",
    decision.created_at !== null && decision.created_at !== undefined,
  );

  TestValidator.predicate(
    "decision should be immutable (no deletion timestamp yet)",
    decision.deleted_at === null || decision.deleted_at === undefined,
  );
}
