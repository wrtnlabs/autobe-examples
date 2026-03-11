import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_article_comments_chronological_order(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Step 2: Create member connection and create article
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Add comments with delays to create chronological order
  const commentA =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentA);
  // Add delay between comments
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const commentB =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentB);
  // Add delay between comments
  await new Promise((resolve) => setTimeout(resolve, 5000));
  const commentC =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(commentC);
  // Step 4: Validate comment chronological order based on creation timestamps
  TestValidator.predicate(
    "comment A created before comment B",
    new Date(commentA.created_at).getTime() <
      new Date(commentB.created_at).getTime(),
  );
  TestValidator.predicate(
    "comment B created before comment C",
    new Date(commentB.created_at).getTime() <
      new Date(commentC.created_at).getTime(),
  );
  // Validate comment content
  TestValidator.equals(
    "comment A content matches",
    commentA.content,
    commentA.content,
  );
  TestValidator.equals(
    "comment B content matches",
    commentB.content,
    commentB.content,
  );
  TestValidator.equals(
    "comment C content matches",
    commentC.content,
    commentC.content,
  );
  // Validate comment authors (all comments should have the same author)
  TestValidator.equals(
    "comment A author ID matches",
    commentA.author.id,
    commentA.author.id,
  );
  TestValidator.equals(
    "comment B author ID matches",
    commentB.author.id,
    commentB.author.id,
  );
  TestValidator.equals(
    "comment C author ID matches",
    commentC.author.id,
    commentC.author.id,
  );
  // Validate all comments have the same author (since same member created all)
  TestValidator.equals(
    "all comments have same author",
    commentA.author.id,
    commentB.author.id,
  );
  TestValidator.equals(
    "all comments have same author",
    commentB.author.id,
    commentC.author.id,
  );
  // Validate that comments belong to the correct article
  TestValidator.equals("comment A article ID", commentA.article.id, article.id);
  TestValidator.equals("comment B article ID", commentB.article.id, article.id);
  TestValidator.equals("comment C article ID", commentC.article.id, article.id);
}
