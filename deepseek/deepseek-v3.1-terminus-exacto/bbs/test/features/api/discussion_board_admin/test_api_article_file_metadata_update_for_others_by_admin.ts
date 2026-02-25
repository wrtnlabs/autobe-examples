import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

/**
 * Test administrator authority to update file metadata for another user's article.
 * Authentication as multiple administrators to validate cross-admin permissions.
 */
export async function test_api_article_file_metadata_update_for_others_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first administrator (article creator)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_admin_join(adminAConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminA);
  // Generate random article data
  const articleBody = typia.random<IDiscussionBoardArticle.ICreate>();
  // 2. Create article as Administrator A
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminAConnection,
    { body: articleBody },
  );
  typia.assert(article);
  // 3. Create file attachment on Administrator A's article
  const fileData = {
    attachment_file_id: typia.random<string & typia.tags.Format<"uuid">>(),
    display_order: typia.random<number & typia.tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;
  const fileAttachment =
    await api.functional.discussionBoard.admin.articles.images.create(
      adminAConnection,
      { articleId: article.id, body: fileData },
    );
  typia.assert(fileAttachment);
  // 4. Create second administrator (cross-permission tester)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_admin_join(adminBConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      ip: typia.random<string & typia.tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminB);
  // 5. Test cross-admin file metadata update
  const updateData = {
    display_order: typia.random<
      number & typia.tags.Type<"int32"> & typia.tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    caption: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const updatedFile =
    await api.functional.discussionBoard.admin.articles.files.patchByArticleid(
      adminBConnection,
      { articleId: article.id, body: updateData },
    );
  typia.assert(updatedFile);
  // 6. Validate cross-admin permissions work
  TestValidator.equals(
    "admin cross-permission",
    updatedFile.id,
    fileAttachment.id,
  );
  TestValidator.equals(
    "admin can modify display order",
    updatedFile.display_order,
    updateData.display_order,
  );
  TestValidator.equals(
    "admin can modify alt text",
    updatedFile.alt_text,
    updateData.alt_text,
  );
  TestValidator.equals(
    "admin can modify caption",
    updatedFile.caption,
    updateData.caption,
  );
  console.log(
    "✅ Administrator cross-permission test passed - admins can update file metadata regardless of article ownership",
  );
}