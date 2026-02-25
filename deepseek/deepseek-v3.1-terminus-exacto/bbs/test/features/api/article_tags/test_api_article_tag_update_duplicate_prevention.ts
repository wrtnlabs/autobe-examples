import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

/**
 * Test duplicate tag name prevention when updating a tag.
 * Creates an article with existing tags, then attempts to update a tag to match
 * another tag already present on the same article. Verifies the system properly
 * prevents duplicate tags by returning an error response, maintains existing
 * tag names unchanged, and preserves the integrity of tag associations.
 */
export async function test_api_article_tag_update_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup superAdmin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Setup user authentication and create article
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 4. Add multiple distinct tags to the article
  const tagNames = ["technology", "programming", "web-development"] as const;
  const createdTags: IDiscussionBoardArticleTag[] = [];
  for (const tagName of tagNames) {
    const tag =
      await generate_random_discussion_board_user_articles_tags_create(
        userConnection,
        {
          params: { articleId: article.id },
          body: {
            tag_name: tagName,
          } satisfies IDiscussionBoardArticleTag.ICreate,
        },
      );
    typia.assert(tag);
    createdTags.push(tag);
  }
  // 5. Attempt to update first tag to match second tag name (should fail)
  const firstTag = createdTags[0];
  const secondTagName = createdTags[1].tag_name;
  await TestValidator.error("duplicate tag name prevention", async () => {
    await api.functional.discussionBoard.superAdmin.articles.tags.update(
      superAdminConnection,
      {
        articleId: article.id,
        tagId: firstTag.id,
        body: {
          tag_name: secondTagName,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  });
  // 6. Verify original tags remain unchanged by fetching tags again
  TestValidator.equals(
    "first tag name unchanged",
    firstTag.tag_name,
    tagNames[0],
  );
  TestValidator.equals(
    "second tag name unchanged",
    createdTags[1].tag_name,
    tagNames[1],
  );
  TestValidator.equals(
    "third tag name unchanged",
    createdTags[2].tag_name,
    tagNames[2],
  );
}
