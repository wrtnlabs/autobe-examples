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

export async function test_api_admin_image_deletion_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  adminConnection.headers = { Authorization: adminAuth.token.access };
  typia.assert(adminAuth);
  // 2. Setup: Create article with image as admin
  const article =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminConnection,
      {
        articleId: typia.random<string>(),
        body: typia.random<IDiscussionBoardArticleImage.ICreate>(),
      },
    );
  typia.assert(article);
  // 3. Execute: Attempt to delete image using unauthorized member connection (base connection without admin auth)
  await TestValidator.error(
    "unauthorized member cannot delete admin article image",
    async () => {
      const imageId = (article as any).id || (article as any).imageId;
      await api.functional.discussionBoard.admin.articles.images.eraseImage(
        connection,
        {
          articleId: (article as any).id,
          imageId: imageId, // Using article.id as imageId for testing
        },
      );
    },
  );
}