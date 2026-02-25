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

export async function test_api_file_download_admin_access_valid_file(
  connection: api.IConnection,
): Promise<void> {
  // 1. 创建管理员连接并认证
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. 使用生成函数创建文章
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      },
    },
  );
  typia.assert(article);
  // 3. 为文章创建图像附件
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  const imageAttachment =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          attachment_file_id: attachmentFileId,
          display_order: 1 satisfies number as number,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(imageAttachment);
  // 4. 下载文件
  const downloadedFile =
    await api.functional.discussionBoard.admin.articles.files.at(
      adminConnection,
      {
        articleId: article.id,
        fileId: imageAttachment.id,
      },
    );
  typia.assert(downloadedFile);
  // 5. 验证文件元数据
  TestValidator.equals("文件ID匹配", downloadedFile.id, imageAttachment.id);
  TestValidator.predicate(
    "包含附件文件",
    () => downloadedFile.attachment_file !== undefined,
  );
  TestValidator.predicate(
    "文件名不为空",
    () => downloadedFile.attachment_file.filename.length > 0,
  );
  TestValidator.predicate(
    "文件大小非负",
    () => downloadedFile.attachment_file.file_size >= 0,
  );
  TestValidator.predicate(
    "MIME类型不为空",
    () => downloadedFile.attachment_file.mime_type.length > 0,
  );
  TestValidator.predicate(
    "存储路径不为空",
    () => downloadedFile.attachment_file.storage_path.length > 0,
  );
}
