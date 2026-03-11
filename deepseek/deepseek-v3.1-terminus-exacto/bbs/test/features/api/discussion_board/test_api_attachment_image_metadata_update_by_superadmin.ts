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

export async function test_api_attachment_image_metadata_update_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IDiscussionBoardMember.IJoin>,
  });
  typia.assert(memberAuth);
  // Create article using member connection
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
    },
  );
  typia.assert(article);
  // Create superAdmin connection and join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies DeepPartial<IDiscussionBoardSuperAdmin.IJoin>,
    },
  );
  typia.assert(superAdminAuth);
  // Create attachment using superAdmin connection
  const attachment =
    await generate_random_discussion_board_super_admin_articles_attachments_create(
      superAdminConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          filename: `image_${RandomGenerator.alphabets(8)}.jpg`,
          filetype: "jpg",
          mime_type: "image/jpeg",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies DeepPartial<IDiscussionBoardAttachment.ICreate>,
      },
    );
  typia.assert(attachment);
  // Update image metadata
  const updateData = {
    width: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    height: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    altText: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IDiscussionBoardImageAttachment.IUpdate;
  const updatedMetadata =
    await api.functional.discussionBoard.superAdmin.articles.attachments.image_metadata.update(
      superAdminConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: updateData,
      },
    );
  typia.assert(updatedMetadata);
  // Validate the update
  TestValidator.equals(
    "width should match update",
    updatedMetadata.width,
    updateData.width,
  );
  TestValidator.equals(
    "height should match update",
    updatedMetadata.height,
    updateData.height,
  );
  TestValidator.equals(
    "alt text should match update",
    updatedMetadata.alt_text,
    updateData.altText,
  );
  TestValidator.equals(
    "attachment ID should match",
    updatedMetadata.discussion_board_attachment_id,
    attachment.id,
  );
  TestValidator.predicate(
    "created_at should be valid date",
    new Date(updatedMetadata.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    new Date(updatedMetadata.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be after created_at",
    new Date(updatedMetadata.updated_at).getTime() >=
      new Date(updatedMetadata.created_at).getTime(),
  );
}
