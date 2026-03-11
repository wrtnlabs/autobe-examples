import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_article_attachment_image_metadata_admin_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create test article - note: section ID must be provided by test setup
  // Since section creation is not available in the API, we'll use a placeholder approach
  // In a real scenario, this would require pre-existing section data
  const article = await generate_random_discussion_board_member_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Attach image file to article
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: "test-image.jpg",
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 4. Update image metadata
  const updateBody = {
    width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    altText: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardImageAttachment.IUpdate;
  const updatedMetadata =
    await api.functional.discussionBoard.admin.articles.attachments.image_metadata.update(
      adminConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMetadata);
  // 5. Validate metadata update
  TestValidator.equals(
    "width should match update",
    updatedMetadata.width,
    updateBody.width!,
  );
  TestValidator.equals(
    "height should match update",
    updatedMetadata.height,
    updateBody.height!,
  );
  TestValidator.equals(
    "altText should match update",
    updatedMetadata.alt_text,
    updateBody.altText,
  );
  TestValidator.equals(
    "attachment ID should match",
    updatedMetadata.discussion_board_attachment_id,
    attachment.id,
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    updatedMetadata.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    updatedMetadata.updated_at !== undefined,
  );
}
