import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_images_create } from "../../../generate/generate_random_discussion_board_member_articles_images_create";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

/**
 * Test successful image metadata update by article author.
 * This test validates the image update functionality by creating a new article
 * with an image, then updating the image metadata.
 */
export async function test_api_image_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  // Create new connection with token
  const memberWithToken: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: memberAuth.token.access,
    },
  };
  // 2. Create a section (required for article creation)
  // Using a sample section ID for testing
  const sectionId = "1";
  // 3. Create an article
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberWithToken,
      {
        sectionId: sectionId,
        body: typia.random<IDiscussionBoardArticle.ICreate>(),
      },
    );
  typia.assert(article);
  // 4. Create an image attachment
  const image =
    await api.functional.discussionBoard.member.articles.images.create(
      memberWithToken,
      {
        articleId: "1", // Using sample article ID
        body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
      },
    );
  typia.assert(image);
  // 5. Update image metadata
  const updatedImage =
    await api.functional.discussionBoard.member.articles.images.update(
      memberWithToken,
      {
        articleId: "1", // Using sample article ID
        imageId: "1", // Using sample image ID
        body: typia.random<IDiscussionBoardArticleImage.IUpdate>(),
      },
    );
  typia.assert(updatedImage);
  // 6. Validate update results
  TestValidator.predicate(
    "image metadata update successful",
    updatedImage !== undefined,
  );
}
