import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create an article first using the utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create multiple tags for the article using utility function
  const tagsToCreate = ArrayUtil.repeat(3, () => ({
    tag_name: RandomGenerator.name(1),
  }));
  const createdTags: IDiscussionBoardArticleTag[] = [];
  for (const tagData of tagsToCreate) {
    const tag =
      await generate_random_discussion_board_user_articles_tags_create(
        userConnection,
        {
          body: tagData satisfies IDiscussionBoardArticleTag.ICreate,
          params: { articleId: article.id },
        },
      );
    typia.assert(tag);
    createdTags.push(tag);
  }
  // Validate that tags are properly associated with the article
  for (const tag of createdTags) {
    TestValidator.equals(
      "tag name matches input",
      tag.tag_name,
      tagsToCreate.find((t) => t.tag_name === tag.tag_name)?.tag_name,
    );
    TestValidator.equals("article id matches", tag.article.id, article.id);
    TestValidator.predicate("created_at is set", tag.created_at !== null);
    TestValidator.predicate("updated_at is set", tag.updated_at !== null);
    TestValidator.equals(
      "deleted_at is null for active tags",
      tag.deleted_at,
      null,
    );
  }
  // Verify uniqueness - try to create duplicate tag
  await TestValidator.error("duplicate tag creation should fail", async () => {
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        body: {
          tag_name: tagsToCreate[0].tag_name,
        } satisfies IDiscussionBoardArticleTag.ICreate,
        params: { articleId: article.id },
      },
    );
  });
  // Validate author information in tag response
  TestValidator.equals(
    "author id matches",
    createdTags[0].article.author.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "author display name matches",
    createdTags[0].article.author.display_name,
    authorizedUser.display_name,
  );
}
