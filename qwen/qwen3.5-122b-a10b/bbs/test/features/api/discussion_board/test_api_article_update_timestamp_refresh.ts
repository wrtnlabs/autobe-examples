import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_update_timestamp_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // Store original timestamp
  const originalCreatedAt = article.created_at;
  const originalUpdatedAt = article.updated_at;
  // 3. Wait a brief moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Update the article with new content
  const updateBody = {
    title: RandomGenerator.name(3),
    body: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardArticle.IUpdate;
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate timestamp refresh
  TestValidator.predicate(
    "updated_at should be later than created_at",
    new Date(updatedArticle.updated_at) > new Date(updatedArticle.created_at),
  );
  TestValidator.predicate(
    "updated_at should be refreshed (later than original)",
    new Date(updatedArticle.updated_at) > new Date(originalUpdatedAt),
  );
  TestValidator.equals(
    "article ID should remain unchanged",
    updatedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );
}
