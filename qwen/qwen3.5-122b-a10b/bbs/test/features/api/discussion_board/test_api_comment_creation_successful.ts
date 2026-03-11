import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test successful comment creation on an existing article.
 *
 * This test validates the complete workflow of a member posting a comment:
 * 1. Article owner authenticates and creates an article
 * 2. Second member authenticates and posts a comment on the article
 * 3. System validates article existence, member authentication, and non-empty content
 * 4. Created comment includes full entity details with author and article references
 */
export async function test_api_comment_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Article owner authenticates via member join
  const articleOwnerConnection: api.IConnection = { host: connection.host };
  const articleOwnerAuth = await authorize_member_join(articleOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(articleOwnerAuth);
  // 2. Article owner creates an article
  // Note: In simulation mode, section ID validation is relaxed
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article = await generate_random_discussion_board_member_articles_create(
    articleOwnerConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Second member authenticates via member join
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenterAuth = await authorize_member_join(commenterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(commenterAuth);
  // 4. Commenter posts a comment on the article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      commenterConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Validate comment structure and relationships
  TestValidator.predicate(
    "comment has non-empty content",
    comment.content.length > 0,
  );
  TestValidator.predicate(
    "comment has created_at timestamp",
    comment.created_at !== null,
  );
  TestValidator.predicate(
    "comment has updated_at timestamp",
    comment.updated_at !== null,
  );
  TestValidator.equals(
    "comment author ID matches commenter",
    comment.member.id,
    commenterAuth.id,
  );
  TestValidator.equals(
    "comment article ID matches created article",
    comment.article.id,
    article.id,
  );
  TestValidator.predicate(
    "comment author has display name",
    comment.member.display_name.length > 0,
  );
  TestValidator.equals(
    "comment article title matches",
    comment.article.title,
    article.title,
  );
}
