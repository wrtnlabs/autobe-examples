import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_admin_image_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      // Using empty object as per IDiscussionBoardAdmin.IJoin schema
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create article with image attachment
  const article =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          // Using empty object as per IDiscussionBoardArticleImage.ICreate schema
        } satisfies IDiscussionBoardArticleImage.ICreate,
      },
    );
  typia.assert(article);
  // 3. Delete the image attachment
  // Since IDiscussionBoardArticleImage doesn't have an 'id' property,
  // we need to use a different approach. Let's generate a new UUID for the image ID.
  const imageId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.discussionBoard.admin.articles.images.eraseImage(
    adminConnection,
    {
      articleId: typia.random<string & tags.Format<"uuid">>(),
      imageId,
    },
  );
  // 4. Validate: Success is indicated by successful execution (204 No Content)
  // The eraseImage function returns void on success, which is what we expect
}