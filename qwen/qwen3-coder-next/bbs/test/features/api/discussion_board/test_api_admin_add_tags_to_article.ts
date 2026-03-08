import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_admin_add_tags_to_article(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string &
        tags.MinLength<8> &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a section
  const section =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create an article
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Add new tags to the article
  const newTagsResult =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: ["typescript", "javascript", "frontend"] as const,
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(newTagsResult);
  TestValidator.equals("status is success", newTagsResult.status, "success");
  TestValidator.equals("tags added count", newTagsResult.tagsAdded, 3);
  // 5. Add existing tags mixed with new tags
  const mixedTagsResult =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: ["typescript", "backend", "api"] as const,
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  typia.assert(mixedTagsResult);
  TestValidator.equals("mixed tags status", mixedTagsResult.status, "success");
  TestValidator.equals(
    "mixed tags count (1 existing + 2 new)",
    mixedTagsResult.tagsAdded,
    3,
  );
  // 6. Test with non-existent article ID (should throw 404)
  await TestValidator.error("non-existent article ID", async () => {
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          tags: ["test"] as const,
        } satisfies IDiscussionBoardArticle.ITagsRequest,
      },
    );
  });
}
