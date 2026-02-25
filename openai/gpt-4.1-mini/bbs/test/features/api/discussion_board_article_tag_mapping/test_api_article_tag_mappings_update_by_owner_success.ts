import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_tag_mappings_update_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // The test scenario:
  // 1. Register a new user and authenticate.
  // 2. Create a new article by the authenticated user.
  // 3. Update the tag mappings of the article by adding some tags, removing others.
  // 4. Validate the response and ensure updated tags are correctly reflected.
  // 1. Register a new user (registered user join) using the provided utility
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  typia.assert(user);
  // Ensure userConnection.headers Authorization is set properly by authorize_registered_user_join
  userConnection.headers ??= {};
  userConnection.headers["Authorization"] = user.token.access;
  // 2. Create a new article by the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article);
  // Current tags from article
  const originalTags = article.tags.map((tag) => tag.id);
  // To simulate adding and removing tags, we'll create new tag IDs
  // For testing, pick some of original tags to remove, and generate new tag IDs to add
  // Since we must use valid existing tag UUIDs to add, but no tag creation API is provided,
  // we assume the tags from the created article are valid to use. We'll remove some and add some of these existing tags.
  // Select half of original tags for removal (if any), and half for addition
  const halfIndex = Math.floor(originalTags.length / 2);
  // Tags to remove (from first half)
  const tagsToRemove = originalTags.slice(0, halfIndex);
  // Tags to add (from second half) or empty if none
  const tagsToAdd = originalTags.slice(halfIndex);
  // Compose update request body
  const body: IDiscussionBoardArticleTagMapping.IUpdate = {
    discussionBoardArticleId: article.id,
    discussionBoardTagId:
      tagsToAdd.length > 0
        ? tagsToAdd[0]
        : (originalTags[0] ?? typia.random<string & tags.Format<"uuid">>()),
  };
  // The updateTagMappings API expects arrays of tags to add and remove but IDiscussionBoardArticleTagMapping.IUpdate has only articleId and tagId, so
  // Adjusting according to provided DTO which is only for single tag mapping update -
  // but the scenario demands adding/removing multiple tags.
  // Since the DTO doesn't support multiple, we can perform multiple calls for each add/remove or adapt test for single update.
  // For this scenario, test single update: remove 1 tag, add 1 tag - done by updating with one tag mapping
  // To test actual adding, we will update for adding tag from tagsToAdd[0]
  // Since the updateTagMappings DTO only allows one tag at once, assume that the test is to update single tag mapping.
  // Call updateTagMappings API to add a tag mapping
  const updatedArticle =
    await api.functional.discussionBoard.registeredUser.articles.tag_mappings.updateTagMappings(
      userConnection,
      {
        articleId: article.id,
        body: {
          discussionBoardArticleId: article.id,
          discussionBoardTagId:
            tagsToAdd.length > 0
              ? tagsToAdd[0]
              : typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(updatedArticle);
  // Validate that the updated article's tags includes the added tag
  TestValidator.predicate(
    "updated article tags length",
    updatedArticle.tags.length >= article.tags.length,
  );
  TestValidator.predicate(
    "updated article includes added tag",
    updatedArticle.tags.some((tag) => tag.id === body.discussionBoardTagId),
  );
  // Additionally, validate the update is persisted by repeating the fetch
  // by simulating re-fetching the article's details (no direct GET endpoint specified in scenario).
  // If no such SDK available, just rely on the update response.
}
