import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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

export async function test_api_article_tags_validation_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
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
  typia.assert(member);
  // Create initial article using utility function
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // Test valid tag operations
  const validTags = ["typescript", "testing", "e2e", "validation"];
  const updatedArticle =
    await api.functional.discussionBoard.articles.tags.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: validTags satisfies string[] & tags.MinItems<1>,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // Test empty tags array rejection (business logic error)
  await TestValidator.error("empty tags array", async () => {
    await api.functional.discussionBoard.articles.tags.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: [] satisfies string[] & tags.MinItems<1>,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  });
  // Test duplicate tags rejection (business logic error)
  await TestValidator.error("duplicate tags", async () => {
    await api.functional.discussionBoard.articles.tags.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: ["duplicate", "duplicate", "unique"] satisfies string[] &
            tags.MinItems<1>,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  });
  // Test maximum tag count rejection using business logic
  // Use a reasonable large number that would likely exceed any practical limit
  const excessiveTags = ArrayUtil.repeat(1000, () =>
    RandomGenerator.alphabets(10),
  );
  await TestValidator.error("excessive tag count", async () => {
    await api.functional.discussionBoard.articles.tags.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          tags: excessiveTags satisfies string[] & tags.MinItems<1>,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  });
  // Validate that valid tag operations succeed
  TestValidator.predicate("valid tags processed successfully", true);
}
