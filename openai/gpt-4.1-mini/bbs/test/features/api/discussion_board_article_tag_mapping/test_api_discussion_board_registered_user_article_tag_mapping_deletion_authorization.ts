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
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";

export async function test_api_discussion_board_registered_user_article_tag_mapping_deletion_authorization(
  connection: api.IConnection,
) {
  // Scenario 1: Successfully delete a tag mapping by the article owner
  {
    // Register and authenticate a new registered user
    const firstUserConnection: api.IConnection = { host: connection.host };
    const firstUser = await authorize_registered_user_join(
      firstUserConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "StrongPassw0rd!",
        },
      },
    );
    firstUserConnection.headers = { Authorization: firstUser.token.access };
    // Create a new article as the first user
    const article =
      await generate_random_discussion_board_registered_user_articles_create(
        firstUserConnection,
        { body: { tags: [] } },
      );
    // Create a new tag mapping for the article
    const tagMappingPage =
      await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(
        firstUserConnection,
        {
          params: { articleId: article.id },
          body: {
            discussion_board_article_id: article.id,
            discussion_board_tag_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    typia.assert(tagMappingPage);
    TestValidator.predicate(
      "tag mapping created",
      tagMappingPage.data.length > 0,
    );
    // Delete the tag mapping as the article owner
    const tagMappingToDelete = tagMappingPage.data[0];
    await api.functional.discussionBoard.registeredUser.articles.tag_mappings.erase(
      firstUserConnection,
      {
        articleId: article.id,
        tagMappingId: tagMappingToDelete.id,
      },
    );
    // Validate the tag mapping is deleted
    const refreshedTagMappings =
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.createTagMappings(
        firstUserConnection,
        {
          articleId: article.id,
          body: {
            discussion_board_article_id: article.id,
            discussion_board_tag_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    typia.assert(refreshedTagMappings);
    TestValidator.predicate(
      "tag mapping deleted",
      !ArrayUtil.has(
        refreshedTagMappings.data,
        (e) => e.id === tagMappingToDelete.id,
      ),
    );
  }
  // Scenario 2: Unauthorized delete attempt by different user
  {
    // Register and authenticate the first user
    const ownerConnection: api.IConnection = { host: connection.host };
    const owner = await authorize_registered_user_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassw0rd!",
      },
    });
    ownerConnection.headers = { Authorization: owner.token.access };
    // Create an article as the first user
    const article =
      await generate_random_discussion_board_registered_user_articles_create(
        ownerConnection,
        { body: { tags: [] } },
      );
    // Create a tag mapping for the article
    const tagMappingPage =
      await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(
        ownerConnection,
        {
          params: { articleId: article.id },
          body: {
            discussion_board_article_id: article.id,
            discussion_board_tag_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    typia.assert(tagMappingPage);
    // Register and authenticate the second user who is NOT the article owner
    const secondUserConnection: api.IConnection = { host: connection.host };
    const secondUser = await authorize_registered_user_join(
      secondUserConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "StrongPassw0rd!",
        },
      },
    );
    secondUserConnection.headers = { Authorization: secondUser.token.access };
    // Attempt deletion by unauthorized user and expect 403 Forbidden
    await TestValidator.httpError(
      "forbidden delete by non-owner",
      403,
      async () =>
        await api.functional.discussionBoard.registeredUser.articles.tag_mappings.erase(
          secondUserConnection,
          {
            articleId: article.id,
            tagMappingId: tagMappingPage.data[0].id,
          },
        ),
    );
    // Verify tag mapping still exists
    const verifyTagMappings =
      await api.functional.discussionBoard.registeredUser.articles.tag_mappings.createTagMappings(
        ownerConnection,
        {
          articleId: article.id,
          body: {
            discussion_board_article_id: article.id,
            discussion_board_tag_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          },
        },
      );
    typia.assert(verifyTagMappings);
    TestValidator.predicate(
      "tag mapping intact after forbidden delete",
      ArrayUtil.has(
        verifyTagMappings.data,
        (e) => e.id === tagMappingPage.data[0].id,
      ),
    );
  }
}
