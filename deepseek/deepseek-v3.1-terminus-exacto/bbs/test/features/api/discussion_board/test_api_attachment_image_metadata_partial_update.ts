import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardImageAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_attachments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_attachment_image_metadata_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Create article using direct SDK call (no utility function available)
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Create image attachment using direct SDK call
  const attachment =
    await api.functional.discussionBoard.superAdmin.articles.attachments.create(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          filename: `image_${RandomGenerator.alphabets(5)}.jpg`,
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);
  // 5. Create initial image metadata with dimensions and alt text
  const initialImageMetadata =
    await api.functional.discussionBoard.superAdmin.articles.attachments.image_metadata.update(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: {
          width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          altText: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardImageAttachment.IUpdate,
      },
    );
  typia.assert(initialImageMetadata);
  // 6. Store original values for comparison
  const originalWidth = initialImageMetadata.width;
  const originalHeight = initialImageMetadata.height;
  const originalAltText = initialImageMetadata.alt_text;
  // 7. Perform partial update - only change alt text
  const newAltText = RandomGenerator.paragraph({ sentences: 1 });
  const updatedImageMetadata =
    await api.functional.discussionBoard.superAdmin.articles.attachments.image_metadata.update(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: {
          altText: newAltText,
        } satisfies IDiscussionBoardImageAttachment.IUpdate,
      },
    );
  typia.assert(updatedImageMetadata);
  // 8. Validate partial update behavior
  TestValidator.equals(
    "width unchanged after partial update",
    updatedImageMetadata.width,
    originalWidth,
  );
  TestValidator.equals(
    "height unchanged after partial update",
    updatedImageMetadata.height,
    originalHeight,
  );
  TestValidator.notEquals(
    "alt text updated after partial update",
    updatedImageMetadata.alt_text,
    originalAltText,
  );
  TestValidator.equals(
    "new alt text matches input",
    updatedImageMetadata.alt_text,
    newAltText,
  );
  // 9. Validate data integrity
  TestValidator.equals(
    "attachment ID consistency",
    updatedImageMetadata.discussion_board_attachment_id,
    attachment.id,
  );
  TestValidator.predicate(
    "created_at timestamp preserved",
    updatedImageMetadata.created_at === initialImageMetadata.created_at,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedImageMetadata.updated_at,
    initialImageMetadata.updated_at,
  );
}
