import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

export async function test_api_attachment_image_metadata_create_when_none_exists(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Register member account
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
  // Step 2: Create article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
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
  // Step 3: Create attachment
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
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
  // Step 4: Update image metadata (should create new metadata since none exists)
  const imageMetadataUpdate = {
    width: 1200 satisfies number as number,
    height: 800 satisfies number as number,
    altText: "Test image description" satisfies string as string,
  } satisfies IDiscussionBoardImageAttachment.IUpdate;
  const imageMetadata =
    await api.functional.discussionBoard.member.articles.attachments.image_metadata.update(
      memberConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: imageMetadataUpdate,
      },
    );
  typia.assert(imageMetadata);
  // Step 5: Validate the newly created image metadata
  TestValidator.equals("width should match", imageMetadata.width, 1200);
  TestValidator.equals("height should match", imageMetadata.height, 800);
  TestValidator.equals(
    "alt text should match",
    imageMetadata.alt_text,
    "Test image description",
  );
  TestValidator.equals(
    "attachment ID should match",
    imageMetadata.discussion_board_attachment_id,
    attachment.id,
  );
  // Validate required timestamp fields are present
  TestValidator.predicate(
    "created_at should be present",
    imageMetadata.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at should be present",
    imageMetadata.updated_at !== undefined,
  );
  TestValidator.predicate(
    "created_at should be valid date",
    new Date(imageMetadata.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    new Date(imageMetadata.updated_at).toString() !== "Invalid Date",
  );
  // Validate UUID format
  TestValidator.predicate(
    "ID should be valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      imageMetadata.id,
    ),
  );
  // Validate create-then-update behavior by checking timestamps are recent
  const now = new Date();
  const createdAt = new Date(imageMetadata.created_at);
  const updatedAt = new Date(imageMetadata.updated_at);
  TestValidator.predicate(
    "created_at should be recent",
    now.getTime() - createdAt.getTime() < 60000,
  );
  TestValidator.predicate(
    "updated_at should be recent",
    now.getTime() - updatedAt.getTime() < 60000,
  );
}