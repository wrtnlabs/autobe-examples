import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that comments from banned users remain visible on articles.
 *
 * This test validates the business rule that banning a user restricts their
 * ability to log in and create new content, but does NOT hide their existing
 * comments. This preserves discussion continuity and distinguishes ban from
 * account deletion.
 *
 * Test Flow:
 * 1. Administrator joins and authenticates
 * 2. Administrator creates a discussion section
 * 3. Member A joins, authenticates, and creates an article
 * 4. Member B joins, authenticates, and creates multiple comments
 * 5. Administrator bans Member B
 * 6. Retrieve comment list and verify Member B's comments are still visible
 */
export async function test_api_article_comment_banned_author_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section for articles
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member A setup - create article
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAAuth);
  const article = await generate_random_discussion_board_member_articles_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 6,
        }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        sectionId: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Member B setup - create multiple comments
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuth = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberBAuth);
  // Create 3 comments from Member B
  const commentContents = ArrayUtil.repeat(3, (index) => ({
    content: `Comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 2 })}`,
  }));
  const comments: IDiscussionBoardComment[] = [];
  for (const commentData of commentContents) {
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberBConnection,
        {
          params: { articleId: article.id },
          body: commentData satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 4. Administrator bans Member B
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        member_id: memberBAuth.id,
        reason: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardBan.ICreate,
    },
  );
  typia.assert(ban);
  // Verify ban was created correctly
  TestValidator.equals("ban member matches", ban.member.id, memberBAuth.id);
  TestValidator.predicate("ban has reason", ban.reason.length > 0);
  // 5. Retrieve comment list (using Member A's connection as "any user")
  const commentList =
    await api.functional.discussionBoard.articles.comments.index(
      memberAConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 20,
          sort: "created_at_asc",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(commentList);
  // 6. Validate comments from banned user are still visible
  TestValidator.predicate(
    "comment list has all comments",
    commentList.data.length === 3,
  );
  TestValidator.equals(
    "pagination records count",
    commentList.pagination.records,
    3,
  );
  // Verify all comments are from Member B (the banned user)
  for (const comment of commentList.data) {
    TestValidator.equals(
      "comment author is Member B",
      comment.author.id,
      memberBAuth.id,
    );
    TestValidator.predicate(
      "comment author display_name preserved",
      comment.author.display_name === memberBAuth.display_name,
    );
    TestValidator.predicate(
      "comment content preserved",
      comment.content.startsWith("Comment "),
    );
    TestValidator.predicate(
      "comment has valid timestamp",
      comment.created_at !== null && comment.created_at.length > 0,
    );
  }
  // Verify chronological order (oldest-first)
  for (let i = 1; i < commentList.data.length; i++) {
    const prevComment = commentList.data[i - 1];
    const currComment = commentList.data[i];
    TestValidator.predicate(
      `comment ${i} is after comment ${i - 1}`,
      new Date(prevComment.created_at).getTime() <=
        new Date(currComment.created_at).getTime(),
    );
  }
}
