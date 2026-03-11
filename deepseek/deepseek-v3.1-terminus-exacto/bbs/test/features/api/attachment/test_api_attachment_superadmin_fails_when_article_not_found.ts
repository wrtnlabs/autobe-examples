import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_attachments_create";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_attachment_superadmin_fails_when_article_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random UUID that doesn't correspond to any existing article
  const nonExistentArticleId = typia.random<string & tags.Format<"uuid">>();
  // Prepare valid attachment creation data
  const attachmentBody: IDiscussionBoardAttachment.ICreate = {
    filename: RandomGenerator.name() + ".txt",
    filetype: "txt",
    mime_type: "text/plain",
    size_bytes: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  } satisfies IDiscussionBoardAttachment.ICreate;
  // Attempt to create attachment using non-existent article ID
  await TestValidator.httpError(
    "attachment creation should fail with 404 for non-existent article",
    404,
    async () =>
      await api.functional.discussionBoard.superAdmin.articles.attachments.create(
        superAdminConnection,
        {
          articleId: nonExistentArticleId,
          body: attachmentBody,
        },
      ),
  );
}
