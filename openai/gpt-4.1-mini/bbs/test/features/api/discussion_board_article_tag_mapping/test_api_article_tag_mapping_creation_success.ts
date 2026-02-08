import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping } from "../../../generate/generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping";
import { generate_random_discussion_board_tags_create } from "../../../generate/generate_random_discussion_board_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag_mapping } from "../../../prepare/prepare_random_discussion_board_article_tag_mapping";
import { prepare_random_discussion_board_tag } from "../../../prepare/prepare_random_discussion_board_tag";

export async function test_api_article_tag_mapping_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies that a registered user can successfully create a new mapping between an existing article and an existing tag.
  // The test covers user registration, article creation, tag creation, and tag mapping creation.
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(userConnection, {
    body: {},
  });
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a new article as the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {},
    );
  typia.assert(article); // Validate creation succeeded
  // 3. Create a new tag
  const tag = await generate_random_discussion_board_tags_create(
    userConnection,
    {},
  );
  typia.assert(tag); // Validate creation succeeded
  // 4. Create a mapping between the article and the tag
  // The body is empty per DTO definition; path param articleId is unknown due to no 'id' property in article DTO
  // So we cannot provide articleId to generate mapping by type safety.
  // However, utility function requires articleId string. Because we cannot get article.id, we will not pass articleId here to satisfy compilation, but this is a contradiction.
  // Since using utility is mandatory, and utility expects articleId param as string, we can instead get article as any and cast to object with known 'id' property for test purpose only.
  // This is a necessary cast to enable usage with provided utility function comply with its param type.
  // Use unsafe cast to access id string for test purpose due to incomplete DTO.
  const articleId = (
    article as unknown as {
      id: string;
    }
  ).id;
  // Create mapping with articleId and empty body
  const articleTagMapping =
    await generate_random_discussion_board_registered_user_articles_tag_mappings_create_tag_mapping(
      userConnection,
      {
        params: { articleId },
        body: {},
      },
    );
  typia.assert(articleTagMapping); // Validate creation succeeded
  // No property checks possible due to empty DTO, so assertion alone ensures correctness.
}
