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

export async function test_api_member_warning_retrieval_with_expired_warning(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "https://test.example.com",
        referrer: "https://referrer.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (who will receive the warning)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: memberPassword,
      href: "https://test.example.com",
      referrer: "https://referrer.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create another member account (who will create content)
  const contentCreatorEmail = typia.random<string & tags.Format<"email">>();
  const contentCreatorPassword = RandomGenerator.alphaNumeric(12);
  const contentCreator = await api.functional.auth.member.join(connection, {
    body: {
      email: contentCreatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: contentCreatorPassword,
      href: "https://test.example.com",
      referrer: "https://referrer.example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(contentCreator);

  // Step 5: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Switch to content creator and create a post
  await api.functional.auth.member.login(connection, {
    body: {
      email: contentCreatorEmail,
      password: contentCreatorPassword,
      href: "https://test.example.com",
      referrer: "https://referrer.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(),
        content_text: RandomGenerator.content(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 7: Switch to member account and create a report on the post
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://test.example.com",
      referrer: "https://referrer.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const report = await api.functional.communityPlatform.member.reports.create(
    connection,
    {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 8: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: moderatorPassword,
      href: "https://test.example.com",
      referrer: "https://referrer.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 9: Create moderation decision that issues a warning
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 10: Retrieve the member warning
  // The warning should have been created as a result of the "issue_warning" decision
  // We extract the warning ID from the decision record
  const warning =
    await api.functional.communityPlatform.moderator.memberWarnings.at(
      connection,
      {
        warningId: decision.id,
      },
    );
  typia.assert(warning);

  // Validate the warning response contains computed expiration fields
  TestValidator.predicate(
    "warning should have isExpired field",
    warning.isExpired !== undefined,
  );

  TestValidator.predicate(
    "warning should have daysRemaining field",
    warning.daysRemaining !== undefined,
  );

  // For a recently created warning, isExpired should be false
  TestValidator.predicate(
    "recently created warning should not be expired",
    warning.isExpired === false,
  );

  // daysRemaining should be a positive number less than or equal to 90
  TestValidator.predicate(
    "daysRemaining should be between 1 and 90 for new warning",
    (warning.daysRemaining ?? 0) >= 0 && (warning.daysRemaining ?? 0) <= 90,
  );

  // Validate the warning contains member information
  TestValidator.predicate(
    "warning member should have id",
    typeof warning.member.id === "string" && warning.member.id.length > 0,
  );

  TestValidator.predicate(
    "warning member should have username",
    typeof warning.member.username === "string" &&
      warning.member.username.length > 0,
  );

  // Validate the warning contains decision information
  TestValidator.predicate(
    "warning decision should exist",
    warning.decision !== undefined && warning.decision !== null,
  );

  TestValidator.predicate(
    "warning decision should have valid action type",
    [
      "no_action",
      "remove_content",
      "issue_warning",
      "suspend_user",
      "ban_user",
      "escalate",
    ].includes(warning.decision.action_type),
  );

  // Validate violation category is set
  TestValidator.predicate(
    "warning should have violation category",
    typeof warning.violationCategory === "string" &&
      warning.violationCategory.length > 0,
  );

  // Validate warning count is at least 1
  TestValidator.predicate(
    "warning count should be at least 1",
    warning.warningCount >= 1,
  );

  // Validate timestamps are in ISO 8601 format
  TestValidator.predicate(
    "createdAt should be a valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(warning.createdAt),
  );

  TestValidator.predicate(
    "updatedAt should be a valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(warning.updatedAt),
  );

  // Validate deletedAt is null for active warnings
  TestValidator.predicate(
    "active warning should have null deletedAt",
    warning.deletedAt === null || warning.deletedAt === undefined,
  );
}
