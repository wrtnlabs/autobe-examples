import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentReport";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can retrieve content reports submitted by any member,
 * not just their own submissions.
 *
 * This test validates the authorization model where moderators have elevated
 * privileges to view the entire moderation queue regardless of report
 * ownership, enabling comprehensive content moderation across the platform.
 *
 * Steps:
 *
 * 1. Create a moderator account with elevated privileges
 * 2. Create three different member accounts
 * 3. Create an article category for organizing articles
 * 4. Create three different articles to be reported
 * 5. Have each member submit a content report for different articles
 * 6. Authenticate as the moderator
 * 7. Retrieve all content reports by their IDs
 * 8. Validate that moderator can access all reports regardless of who submitted
 *    them
 */
export async function test_api_content_report_moderator_access_to_all_reports(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      ip: "192.168.1.100",
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create three different member accounts
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      ip: "192.168.1.101",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member1);

  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member456!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      ip: "192.168.1.102",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member2);

  const member3 = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member789!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      ip: "192.168.1.103",
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member3);

  // Step 3: Authenticate as moderator to create category
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator.email,
      password: "moderator123!",
      ip: "192.168.1.100",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 4: Create article category
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "General Discussion",
          slug: "general-discussion",
          description: "General discussion topics",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Switch to member1 and create article1
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1.email,
      password: "member123!",
      ip: "192.168.1.101",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article1 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);

  // Step 6: Switch to member2 and create article2
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2.email,
      password: "member456!",
      ip: "192.168.1.102",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article2 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);

  // Step 7: Switch to member3 and create article3
  await api.functional.auth.member.login(connection, {
    body: {
      email: member3.email,
      password: "member789!",
      ip: "192.168.1.103",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const article3 = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);

  // Step 8: Member1 submits content report for article2
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1.email,
      password: "member123!",
      ip: "192.168.1.101",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const report1 =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article2.id,
          report_category: "Spam",
          report_details:
            "This article contains spam content and should be reviewed.",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report1);

  // Step 9: Member2 submits content report for article3
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2.email,
      password: "member456!",
      ip: "192.168.1.102",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const report2 =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article3.id,
          report_category: "Offensive Content",
          report_details:
            "This article contains offensive language that violates community guidelines.",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report2);

  // Step 10: Member3 submits content report for article1
  await api.functional.auth.member.login(connection, {
    body: {
      email: member3.email,
      password: "member789!",
      ip: "192.168.1.103",
      href: "https://example.com/member/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ILogin,
  });

  const report3 =
    await api.functional.discussionBoard.member.contentReports.create(
      connection,
      {
        body: {
          discussion_board_article_id: article1.id,
          report_category: "Misinformation",
          report_details:
            "This article contains factually incorrect information and misleads readers.",
        } satisfies IDiscussionBoardContentReport.ICreate,
      },
    );
  typia.assert(report3);

  // Step 11: Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator.email,
      password: "moderator123!",
      ip: "192.168.1.100",
      href: "https://example.com/moderator/login" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ILogin,
  });

  // Step 12: Moderator retrieves report1 (created by member1)
  const retrievedReport1 =
    await api.functional.discussionBoard.moderator.contentReports.at(
      connection,
      {
        reportId: report1.id,
      },
    );
  typia.assert(retrievedReport1);
  TestValidator.equals("report1 ID matches", retrievedReport1.id, report1.id);
  TestValidator.equals(
    "report1 category matches",
    retrievedReport1.report_category,
    "Spam",
  );
  TestValidator.equals(
    "report1 status is pending",
    retrievedReport1.status,
    "pending",
  );

  // Step 13: Moderator retrieves report2 (created by member2)
  const retrievedReport2 =
    await api.functional.discussionBoard.moderator.contentReports.at(
      connection,
      {
        reportId: report2.id,
      },
    );
  typia.assert(retrievedReport2);
  TestValidator.equals("report2 ID matches", retrievedReport2.id, report2.id);
  TestValidator.equals(
    "report2 category matches",
    retrievedReport2.report_category,
    "Offensive Content",
  );
  TestValidator.equals(
    "report2 status is pending",
    retrievedReport2.status,
    "pending",
  );

  // Step 14: Moderator retrieves report3 (created by member3)
  const retrievedReport3 =
    await api.functional.discussionBoard.moderator.contentReports.at(
      connection,
      {
        reportId: report3.id,
      },
    );
  typia.assert(retrievedReport3);
  TestValidator.equals("report3 ID matches", retrievedReport3.id, report3.id);
  TestValidator.equals(
    "report3 category matches",
    retrievedReport3.report_category,
    "Misinformation",
  );
  TestValidator.equals(
    "report3 status is pending",
    retrievedReport3.status,
    "pending",
  );
}
