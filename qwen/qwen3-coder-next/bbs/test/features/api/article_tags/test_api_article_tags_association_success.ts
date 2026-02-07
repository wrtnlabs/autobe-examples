import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_tags_create_tags } from "../../../generate/generate_random_discussion_board_member_articles_tags_create_tags";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

/**
 * Test successful tag association with an article.
 * 1. Join as member and authenticate
 * 2. Create a section and article
 * 3. Associate tags with the article
 * 4. Verify tag association succeeds
 */
export async function test_api_article_tags_association_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      // IDiscussionBoardMember.IJoin has no required fields currently
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // connection.headers is updated internally by authorize_member_join
  // 2. Create a section and article
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await generate_random_discussion_board_member_sections_articles_create(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticle.ICreate has no required fields currently
        } satisfies IDiscussionBoardArticle.ICreate,
        params: {
          sectionId: sectionId,
        },
      },
    );
  typia.assert(article);
  // 3. Associate tags with the article
  const associatedTag =
    await generate_random_discussion_board_member_articles_tags_create_tags(
      memberConnection,
      {
        body: {
          // IDiscussionBoardArticleTag.ICreate has no required fields currently
        } satisfies IDiscussionBoardArticleTag.ICreate,
        params: {
          articleId: articleId,
        },
      },
    );
  typia.assert(associatedTag);
  // 4. Verify tag association
  TestValidator.predicate(
    "tag successfully associated",
    associatedTag !== null,
  );
}
