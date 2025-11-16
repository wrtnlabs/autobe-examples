import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_warning_retrieval_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for system setup
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: "Test Administrator",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create test category as administrator
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: `test-cat-${RandomGenerator.alphaNumeric(6)}`,
          description: "Category for testing",
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account for posting content
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: "MemberPassword123!",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community as member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Test Community",
          identifier: `test-comm-${RandomGenerator.alphaNumeric(8)}`,
          description: "Community for testing warnings",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create post as member
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post",
        content_text: "This is test content that will be reported",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create report on the post
  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "off_topic",
        additional_details: "This post is off-topic for the community",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 7: Create moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      password: "ModeratorPassword123!",
      href: "http://localhost:3000/moderator",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 8: Create moderator decision to issue warning
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason: "Post violates community guidelines on topic appropriateness",
          internal_notes: "Repeat offender for off-topic posts",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 9: Retrieve the member warning by ID
  const warning =
    await api.functional.communityPlatform.moderator.memberWarnings.at(
      connection,
      {
        warningId: decision.id,
      },
    );
  typia.assert(warning);

  // Step 10: Validate warning details
  TestValidator.equals(
    "warning should have correct violation category",
    warning.violationCategory,
    "off_topic",
  );

  TestValidator.predicate(
    "warning count should be at least 1",
    warning.warningCount >= 1,
  );

  TestValidator.predicate(
    "warning should have created timestamp",
    warning.createdAt !== null && warning.createdAt !== undefined,
  );

  TestValidator.predicate(
    "warning should have updated timestamp",
    warning.updatedAt !== null && warning.updatedAt !== undefined,
  );

  TestValidator.predicate(
    "warning should reference the decision",
    warning.decision !== null && warning.decision !== undefined,
  );

  TestValidator.predicate(
    "warning should reference the member",
    warning.member !== null && warning.member !== undefined,
  );

  TestValidator.equals(
    "warning member should match reported member",
    warning.member.id,
    member.id,
  );
}
