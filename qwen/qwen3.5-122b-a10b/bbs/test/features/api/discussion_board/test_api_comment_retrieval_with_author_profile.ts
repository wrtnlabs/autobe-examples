import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful retrieval of a comment with embedded author profile information.
 *
 * This test validates:
 * 1. Admin creates a section
 * 2. Member creates an article in that section
 * 3. Member creates a comment on that article
 * 4. Comment is retrieved successfully with full author profile
 * 5. Response contains all expected comment fields
 * 6. Author information is embedded correctly (display_name, bio)
 * 7. Article summary is included with all required fields
 * 8. Sensitive data (email, ban_status, password) is NOT exposed
 */
export async function test_api_comment_retrieval_with_author_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create admin account and login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Admin login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Create section as admin
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Member setup - create member account and login
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Member login
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 4. Create article as member in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberLoginConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
        tags: [],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Create comment as member on the article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberLoginConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 6. Retrieve the comment using articleId and commentId
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(
      memberLoginConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  // 7. Verify comment fields exist
  TestValidator.equals("comment id matches", retrievedComment.id, comment.id);
  TestValidator.equals(
    "comment content matches",
    retrievedComment.content,
    comment.content,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedComment.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedComment.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedComment.deleted_at === null,
  );
  // 8. Verify author information is embedded correctly
  TestValidator.predicate(
    "author display_name exists",
    retrievedComment.author.displayName !== null,
  );
  TestValidator.predicate(
    "author bio exists",
    retrievedComment.author.bio !== null,
  );
  TestValidator.equals(
    "author id matches",
    retrievedComment.author.id,
    article.author.id,
  );
  // 9. Verify article summary is included
  TestValidator.equals(
    "article id matches",
    retrievedComment.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches",
    retrievedComment.article.title,
    article.title,
  );
  TestValidator.predicate(
    "article author exists",
    retrievedComment.article.author !== null,
  );
  TestValidator.predicate(
    "article section exists",
    retrievedComment.article.section !== null,
  );
  TestValidator.predicate(
    "article tags is array",
    Array.isArray(retrievedComment.article.tags),
  );
  TestValidator.predicate(
    "comments_count is non-negative",
    retrievedComment.article.comments_count >= 0,
  );
  // 10. Verify sensitive data is NOT exposed in author
  TestValidator.predicate(
    "author email not exposed",
    !("email" in retrievedComment.author),
  );
  TestValidator.predicate(
    "author ban_status not exposed",
    !("banStatus" in retrievedComment.author),
  );
}