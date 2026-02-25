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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_image_attachment_success(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Create section for the article
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      },
    },
  );
  typia.assert(section);
  // Create article for image attachment
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // Prepare image attachment data first
  const imageAttachmentBody = {
    attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    alt_text: RandomGenerator.paragraph({ sentences: 1 }),
    caption: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardArticleFile.ICreate;
  // Create image attachment for the article
  const imageAttachment =
    await generate_random_discussion_board_admin_articles_images_create(
      adminConnection,
      {
        params: {
          articleId: article.id,
        },
        body: imageAttachmentBody,
      },
    );
  typia.assert(imageAttachment);
  // Validate image attachment metadata
  TestValidator.equals(
    "article ID matches",
    imageAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "attachment file ID matches",
    imageAttachment.attachment_file.id,
    imageAttachmentBody.attachment_file_id,
  );
  TestValidator.equals(
    "display order matches",
    imageAttachment.display_order,
    imageAttachmentBody.display_order,
  );
  // Handle optional fields with null checks
  if (
    imageAttachmentBody.alt_text !== null &&
    imageAttachmentBody.alt_text !== undefined
  ) {
    TestValidator.equals(
      "alt text matches",
      imageAttachment.alt_text,
      imageAttachmentBody.alt_text,
    );
  } else {
    TestValidator.predicate(
      "alt text is null or undefined",
      imageAttachment.alt_text === null ||
        imageAttachment.alt_text === undefined,
    );
  }
  if (
    imageAttachmentBody.caption !== null &&
    imageAttachmentBody.caption !== undefined
  ) {
    TestValidator.equals(
      "caption matches",
      imageAttachment.caption,
      imageAttachmentBody.caption,
    );
  } else {
    TestValidator.predicate(
      "caption is null or undefined",
      imageAttachment.caption === null || imageAttachment.caption === undefined,
    );
  }
  TestValidator.equals(
    "status is uploaded",
    imageAttachment.status,
    "uploaded",
  );
  TestValidator.predicate(
    "attachment file has valid metadata",
    () =>
      imageAttachment.attachment_file.filename.length > 0 &&
      imageAttachment.attachment_file.file_size >= 0 &&
      imageAttachment.attachment_file.mime_type.length > 0,
  );
}
