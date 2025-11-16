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

export async function test_api_report_update_moderation_notes(
  connection: api.IConnection,
) {
  // 1. Administrator account creation for investigation documentation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create a category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for generating reportable content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "MemberPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community for hosting content
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post to be reported
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Submit initial report against the post
  const initialReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details:
          "Initial report: Potential harassment content detected",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(initialReport);
  TestValidator.equals(
    "initial report status",
    initialReport.status,
    "submitted",
  );

  // Switch to administrator for investigation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 7. First update - assign moderator and add initial investigation notes
  const firstUpdate: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.update(
      connection,
      {
        reportId: initialReport.id,
        body: {
          status: "in_review",
          priority: "medium",
          additional_details:
            "Initial report: Potential harassment content detected. Moderator review started. Examining post context and user history.",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(firstUpdate);
  TestValidator.equals("first update status", firstUpdate.status, "in_review");
  TestValidator.equals("first update priority", firstUpdate.priority, "medium");

  // 8. Second update - add investigation findings
  const secondUpdate: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.update(
      connection,
      {
        reportId: initialReport.id,
        body: {
          status: "pending_decision",
          additional_details:
            "Initial report: Potential harassment content detected. Moderator review started. Examining post context and user history. Investigation findings: Post contains direct personal attacks against community member. Evidence: specific language patterns match known harassment behavior. Cross-reference: user has 2 prior warnings for similar violations.",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "second update status",
    secondUpdate.status,
    "pending_decision",
  );

  // 9. Third update - record decision rationale
  const finalUpdate: ICommunityPlatformReport =
    await api.functional.communityPlatform.administrator.reports.update(
      connection,
      {
        reportId: initialReport.id,
        body: {
          status: "resolved",
          category: "harassment",
          additional_details:
            "Initial report: Potential harassment content detected. Moderator review started. Examining post context and user history. Investigation findings: Post contains direct personal attacks against community member. Evidence: specific language patterns match known harassment behavior. Cross-reference: user has 2 prior warnings for similar violations. Decision rationale: Content clearly violates community harassment policy. Third violation by same user warrants suspension. Post will be removed and user notified of violation.",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  TestValidator.equals("final update status", finalUpdate.status, "resolved");

  // 10. Verify accumulated investigation context
  TestValidator.predicate(
    "additional_details contains initial report",
    (finalUpdate.additional_details || "").includes(
      "Initial report: Potential harassment content detected",
    ),
  );
  TestValidator.predicate(
    "additional_details contains investigation findings",
    (finalUpdate.additional_details || "").includes("Investigation findings:"),
  );
  TestValidator.predicate(
    "additional_details contains cross-reference",
    (finalUpdate.additional_details || "").includes("Cross-reference:"),
  );
  TestValidator.predicate(
    "additional_details contains decision rationale",
    (finalUpdate.additional_details || "").includes("Decision rationale:"),
  );
}
