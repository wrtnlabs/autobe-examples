import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

/**
 * Test administrator role adding tags to another user's article.
 *
 * This test verifies that an administrator can add multiple tags to an article
 * owned by another user. Steps:
 * 1. Register an administrator user and authenticate.
 * 2. Register a normal user and create an article.
 * 3. As the admin, add multiple tags to the normal user's article in a single request.
 * 4. Confirm that all tags are successfully added to the article.
 * 5. Verify the response contains the complete list of tag mappings.
 * 6. Verify admin privileges allow modifying tags regardless of ownership.
 */
export async function test_api_article_tag_mappings_create_success_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator user and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(adminUser);
  // 2. Register normal user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const normalUser = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    },
  });
  typia.assert(normalUser);
  // 3. User creates an article
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: `Article by ${normalUser.displayName}`,
          content: "This is an article content.",
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 4. Admin adds multiple tags to user's article
  const tagIds = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Prepare array of tag mapping create requests
  const tagMappingCreates = tagIds.map((tagId) => ({
    discussion_board_article_id: article.id,
    discussion_board_tag_id: tagId,
  }));
  // Use ArrayUtil.asyncMap to create tag mappings one by one
  const createdMappings = await ArrayUtil.asyncMap(
    tagMappingCreates,
    async (body) => {
      const mapping =
        await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(
          adminConnection,
          {
            params: { articleId: article.id },
            body,
          },
        );
      typia.assert(mapping);
      return mapping;
    },
  );
  // 5. Validate that all added tags exist in the returned mappings
  // The returned mappings is an array of ISummary sets, merge all data arrays
  const allMappings = createdMappings.flatMap((m) => m.data);
  const mappingTagIds = allMappings.map(
    (mapping) => mapping.discussionBoardTagId,
  );
  for (const tagId of tagIds) {
    TestValidator.predicate(
      `Tag id ${tagId} should be in the tag mappings`,
      mappingTagIds.includes(tagId),
    );
  }
}
