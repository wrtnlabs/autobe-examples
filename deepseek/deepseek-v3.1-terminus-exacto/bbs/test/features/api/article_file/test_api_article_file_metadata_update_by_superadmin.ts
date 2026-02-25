import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { generate_random_discussion_board_super_admin_articles_images_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_images_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_metadata_update_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Create a test article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {},
    );
  typia.assert(article);
  // 3. Create image attachment for the article
  const image =
    await generate_random_discussion_board_super_admin_articles_images_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: 0,
          alt_text: "Initial alt text",
        },
      },
    );
  typia.assert(image);
  // 4. Update file metadata
  const updateBody = {
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: "Updated alt text for accessibility",
  } satisfies IDiscussionBoardArticleFile.IUpdate;
  const updated =
    await api.functional.discussionBoard.superAdmin.articles.files.patchByArticleid(
      superAdminConnection,
      {
        articleId: article.id,
        body: updateBody,
      },
    );
  typia.assert(updated);
  // 5. Validate update success
  TestValidator.equals(
    "display_order updated",
    updated.display_order,
    updateBody.display_order,
  );
  TestValidator.equals(
    "alt_text updated",
    updated.alt_text,
    updateBody.alt_text,
  );
  TestValidator.equals(
    "file content unchanged",
    updated.attachment_file.id,
    image.attachment_file.id,
  );
  TestValidator.equals("status unchanged", updated.status, image.status);
  TestValidator.equals(
    "article relation unchanged",
    updated.article.id,
    article.id,
  );
}
