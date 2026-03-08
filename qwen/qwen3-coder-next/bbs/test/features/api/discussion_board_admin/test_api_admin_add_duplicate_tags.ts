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

export async function test_api_admin_add_duplicate_tags(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = typia.random<IDiscussionBoardAdmin.IJoin>();
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: adminUser,
    },
  );
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // Step 2: Create a test article in a section
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: sectionId,
        body: {
          title: "Test Article for Duplicate Tags",
          content:
            "This article is created specifically for testing duplicate tag handling.",
        },
      },
    );
  typia.assert(article);
  // Step 3: Test with 3 identical tag names
  const tag1 = "Tech";
  const tagsRequest1 = {
    tags: [tag1, tag1, tag1],
  } satisfies IDiscussionBoardArticle.ITagsRequest;
  const result1 =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: tagsRequest1,
      },
    );
  typia.assert(result1);
  TestValidator.equals("tagsAdded for 3 identical tags", result1.tagsAdded, 1);
  // Step 4: Test with 5 identical tag names
  const tag2 = "Programming";
  const tagsRequest2 = {
    tags: [tag2, tag2, tag2, tag2, tag2],
  } satisfies IDiscussionBoardArticle.ITagsRequest;
  const result2 =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: tagsRequest2,
      },
    );
  typia.assert(result2);
  TestValidator.equals("tagsAdded for 5 identical tags", result2.tagsAdded, 1);
  // Step 5: Test with mix of duplicates and unique tags
  const tag3 = "Development";
  const tag4 = "Design";
  const tagsRequest3 = {
    tags: [tag3, tag4, tag3, tag4, tag3, "Architecture", tag4],
  } satisfies IDiscussionBoardArticle.ITagsRequest;
  const result3 =
    await api.functional.discussionBoard.admin.articles.tags.addTags(
      adminConnection,
      {
        articleId: article.id,
        body: tagsRequest3,
      },
    );
  typia.assert(result3);
  TestValidator.equals("tagsAdded for mix of duplicates", result3.tagsAdded, 4);
}
