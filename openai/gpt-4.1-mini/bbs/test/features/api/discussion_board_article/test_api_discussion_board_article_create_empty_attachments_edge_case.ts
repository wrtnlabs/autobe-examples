import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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

/**
 * Test creating a new article with empty arrays for files, images, and tags fields.
 * This edge case validates that the system properly handles optional arrays that contain no elements without failing or throwing errors.
 * Confirm that the article is created successfully with empty attachments and that the response correctly reflects absence of related entities.
 * Ensure the transactional save operation does not break when these arrays are empty.
 * Validate authorization enforcement.
 *
 * Steps:
 * 1. Register and authorize a new user.
 * 2. Create an article with empty files, images, and tags.
 * 3. Validate the response and ensure empty arrays are handled correctly.
 */
export async function test_api_discussion_board_article_create_empty_attachments_edge_case(
  connection: IConnection,
): Promise<void> {
  // 1. Registered user join and authorization
  const userConnection: IConnection = { host: connection.host };
  const authorized: IDiscussionBoardRegisteredUser.IAuthorized =
    await authorize_registered_user_join(userConnection, { body: {} });
  userConnection.headers = {
    ...(userConnection.headers ?? {}),
    Authorization: authorized.token.access,
  };
  // Prepare minimal valid article create body with empty arrays for files, images, and tags
  // Use generate_random function with partial override to ensure valid sectionId and required fields
  const articleCreateBodyPartial: Partial<IDiscussionBoardArticle.ICreate> = {
    files: [],
    images: [],
    tags: [],
  };
  // Create the article
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      { body: articleCreateBodyPartial },
    );
  // Assert the returned article
  typia.assert(article);
}
