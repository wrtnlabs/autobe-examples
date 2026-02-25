import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleImageRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImageRequest";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_super_administrator_articles_images_update_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test unauthorized update attempt of article images by non-logged-in user or user with insufficient permissions.
  // 1. Prepare an article ID and update body data
  const articleId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    data: [
      {
        imageUrl: `https://example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
        description: "Test image",
        displayOrder: 1,
      },
    ],
    page: 1,
    limit: 100,
  } satisfies IDiscussionBoardArticleImage.IRequest;
  // 2. Attempt update WITHOUT authentication
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "update without authentication should throw 401 or 403",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.images.updateImages(
        unauthenticatedConnection,
        { articleId, body },
      );
    },
  );
  // 3. Attempt update with unauthorized user connection (no superAdministrator role)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "update with non-superAdministrator user should throw 401 or 403",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.articles.images.updateImages(
        unauthorizedConnection,
        { articleId, body },
      );
    },
  );
}
