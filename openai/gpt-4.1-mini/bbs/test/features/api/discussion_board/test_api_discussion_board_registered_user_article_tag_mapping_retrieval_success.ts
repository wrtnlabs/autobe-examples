import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
export async function test_api_discussion_board_registered_user_article_tag_mapping_retrieval_success(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as a registered user via join
    const userJoinConnection: api.IConnection = { host: connection.host };
    const authorizedUser = await authorize_registered_user_join(userJoinConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        },
    });
    typia.assert(authorizedUser);
    // Use token to create a connection for further operations
    const userConnection: api.IConnection = { host: connection.host };
    userConnection.headers = { Authorization: authorizedUser.token.access };
    // 2. Create a new article for the registered user
    const article = await generate_random_discussion_board_registered_user_articles_create(userConnection, {
        body: {
            title: RandomGenerator.name(),
            content: RandomGenerator.content({ paragraphs: 2 }),
            sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
    });
    typia.assert(article);
    // 3. Add a tag mapping linking the article to an existing tag
    // Prepare tag mapping create request body with articleId and tagId
    // For the tag, randomly generate a UUID - assume existing tag, since no tag create API
    const tagId = typia.random<string & tags.Format<"uuid">>();
    const createTagMappingResponse = await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mappings(userConnection, {
        params: { articleId: article.id },
        body: {
            discussion_board_article_id: article.id,
            discussion_board_tag_id: tagId,
        },
    });
    typia.assert(createTagMappingResponse);
    // Get the first tagMappingId from the response data (there should be one)
    const tagMapping = createTagMappingResponse.data[0];
    typia.assert(tagMapping);
    // 4. Retrieve the tag mapping details by specifying articleId and tagMappingId
    const tagMappingDetails = await api.functional.discussionBoard.registeredUser.articles.tag_mappings.at(userConnection, {
        articleId: article.id,
        tagMappingId: tagMapping.id,
    });
    typia.assert(tagMappingDetails);
    // 5. Validate the response includes the correct article-tag association with all timestamps and nested article and tag summaries
    TestValidator.equals("tagMapping id", tagMappingDetails.id, tagMapping.id);
    TestValidator.equals("tagMapping articleId", tagMappingDetails.article.id, article.id);
    // Removed TestValidator.equals for tagMappingDetails.tag.id since 'id' does not exist on tag summary
    TestValidator.predicate("tagMapping createdAt is ISO string", typeof tagMappingDetails.createdAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(tagMappingDetails.createdAt));
    TestValidator.predicate("tagMapping updatedAt is ISO string", typeof tagMappingDetails.updatedAt === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(tagMappingDetails.updatedAt));
    TestValidator.predicate("tagMapping deletedAt is null or ISO string", tagMappingDetails.deletedAt === null ||
        (typeof tagMappingDetails.deletedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(tagMappingDetails.deletedAt)));
    // Validate nested article and tag summaries
    typia.assert(tagMappingDetails.article);
    typia.assert(tagMappingDetails.tag);
}
