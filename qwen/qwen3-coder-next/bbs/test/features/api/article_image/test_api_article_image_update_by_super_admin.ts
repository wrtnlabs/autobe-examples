import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";

export async function test_api_article_image_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.super_admin.join(
    superAdminConnection,
    {
      body: {},
    },
  );
  // 2. Create an article with image
  const articleImage =
    await api.functional.discussionBoard.superAdmin.articles.images.create(
      superAdminConnection,
      {
        articleId: typia.random<string>(),
        body: {},
      },
    );
  typia.assert(articleImage);
  // 3. Update image metadata
  const updatedImage =
    await api.functional.discussionBoard.superAdmin.articles.images.update(
      superAdminConnection,
      {
        articleId: typia.random<string>(),
        imageId: typia.random<string>(),
        body: {},
      },
    );
  typia.assert(updatedImage);
}
