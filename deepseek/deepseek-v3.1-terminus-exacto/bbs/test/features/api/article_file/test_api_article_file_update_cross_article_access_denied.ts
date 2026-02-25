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

export async function test_api_article_file_update_cross_article_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create first article
  const firstArticle =
    await generate_random_discussion_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(firstArticle);
  // 3. Attach file to first article
  const fileAttachment =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: { articleId: firstArticle.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<number & tags.Type<"int32">>(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // 4. Create second article
  const secondArticle =
    await generate_random_discussion_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(secondArticle);
  // 5. Attempt cross-article file update - should fail
  await TestValidator.error(
    "cannot update file attached to first article using second article ID",
    async () => {
      await api.functional.discussionBoard.admin.articles.files.putByArticleidAndFileid(
        adminConnection,
        {
          articleId: secondArticle.id, // Wrong article ID
          fileId: fileAttachment.id,
          body: {
            display_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
            alt_text: RandomGenerator.paragraph({ sentences: 1 }),
            caption: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardArticleFile.IUpdate,
        },
      );
    },
  );
  // 6. Verify file attachment still exists and unchanged via correct article
  const originalFileCheck =
    await api.functional.discussionBoard.admin.articles.files.putByArticleidAndFileid(
      adminConnection,
      {
        articleId: firstArticle.id, // Correct article ID
        fileId: fileAttachment.id,
        body: {
          display_order: typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(fileAttachment.display_order),
          alt_text: fileAttachment.alt_text ?? null,
          caption: fileAttachment.caption ?? null,
        } satisfies IDiscussionBoardArticleFile.IUpdate,
      },
    );
  typia.assert(originalFileCheck);
  // Validate file properties remain unchanged
  TestValidator.equals(
    "file still accessible via correct article",
    originalFileCheck.id,
    fileAttachment.id,
  );
  TestValidator.equals(
    "display order unchanged",
    originalFileCheck.display_order,
    fileAttachment.display_order,
  );
  TestValidator.equals(
    "alt text unchanged",
    originalFileCheck.alt_text,
    fileAttachment.alt_text,
  );
  TestValidator.equals(
    "caption unchanged",
    originalFileCheck.caption,
    fileAttachment.caption,
  );
}