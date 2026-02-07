import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test administrator's ability to modify tags on any article, regardless of ownership.
 *
 * Steps:
 * 1. Create a regular user account and authenticate
 * 2. Create an article owned by the regular user with initial tags
 * 3. Create an administrator account and authenticate
 * 4. Administrator modifies the tags on the regular user's article
 * 5. Verify tags were successfully updated by administrator
 * 6. Validate regular user cannot modify another user's article tags
 */
export async function test_api_article_tags_admin_modify_any_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(userAuth);
  // 2. Create article as regular user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      },
    },
  );
  typia.assert(article);
  // 3. Create second regular user for permission testing
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUserAuth = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(secondUserAuth);
  // 4. Validate regular user cannot modify another user's article tags
  await TestValidator.error(
    "regular user cannot modify another user's article tags",
    async () => {
      await api.functional.discussionBoard.articles.tags.updateTags(
        secondUserConnection,
        {
          articleId: article.id,
          body: {
            add: [
              RandomGenerator.alphabets(10) satisfies string &
                tags.MaxLength<20>,
            ],
            remove: [],
          } satisfies IDiscussionBoardArticleTag.IModifyTag,
        },
      );
    },
  );
  // 5. Create and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 6. Administrator adds tags to regular user's article
  const tagsToAdd = [
    RandomGenerator.alphabets(10) satisfies string & tags.MaxLength<20>,
    RandomGenerator.alphabets(8) satisfies string & tags.MaxLength<20>,
  ];
  const addTagsResult =
    await api.functional.discussionBoard.articles.tags.updateTags(
      adminConnection,
      {
        articleId: article.id,
        body: {
          add: tagsToAdd,
          remove: [],
        } satisfies IDiscussionBoardArticleTag.IModifyTag,
      },
    );
  typia.assert(addTagsResult);
  // 7. Verify tags were successfully added by administrator
  TestValidator.equals(
    "admin can add tags to any article",
    addTagsResult.article.id,
    article.id,
  );
  // 8. Administrator removes some tags and adds new ones
  const modifyTagsData: IDiscussionBoardArticleTag.IModifyTag = {
    add: [RandomGenerator.alphabets(12) satisfies string & tags.MaxLength<20>],
    remove: [tagsToAdd[0]],
  };
  const finalTagsResult =
    await api.functional.discussionBoard.articles.tags.updateTags(
      adminConnection,
      {
        articleId: article.id,
        body: modifyTagsData,
      },
    );
  typia.assert(finalTagsResult);
  // 9. Final validation of admin tag modification capabilities
  TestValidator.equals(
    "admin can perform complex tag modifications on any article",
    finalTagsResult.article.id,
    article.id,
  );
}
