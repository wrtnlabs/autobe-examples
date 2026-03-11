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

/**
 * Test that a member can successfully update image metadata for an attachment on their own article.
 * 1. Create member account via join
 * 2. Create article as member
 * 3. Create attachment for article
 * 4. Update image metadata with width=800, height=600, and alt text
 * 5. Verify updated metadata matches input values
 * 6. Ensure attachment record remains unchanged
 */
export async function test_api_attachment_image_metadata_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Create article as member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create attachment for article
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
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
  // 4. Update image metadata using SDK function (no utility function available)
  const updateBody: IDiscussionBoardImageAttachment.IUpdate = {
    width: 800,
    height: 600,
    altText: "A test image for metadata update",
  };
  const updatedMetadata =
    await api.functional.discussionBoard.member.articles.attachments.image_metadata.update(
      memberConnection,
      {
        articleId: article.id,
        attachmentId: attachment.id,
        body: updateBody,
      },
    );
  typia.assert(updatedMetadata);
  // 5. Validate updated metadata matches input values
  TestValidator.equals("width should be updated", updatedMetadata.width, 800);
  TestValidator.equals("height should be updated", updatedMetadata.height, 600);
  TestValidator.equals(
    "alt text should be updated",
    updatedMetadata.alt_text,
    "A test image for metadata update",
  );
  // 6. Verify attachment record relationship
  TestValidator.equals(
    "attachment ID should match",
    updatedMetadata.discussion_board_attachment_id,
    attachment.id,
  );
  // Validate system timestamps
  TestValidator.predicate(
    "created_at should be valid ISO date",
    !isNaN(new Date(updatedMetadata.created_at).getTime()) &&
      updatedMetadata.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at should be valid ISO date",
    !isNaN(new Date(updatedMetadata.updated_at).getTime()) &&
      updatedMetadata.updated_at.includes("T"),
  );
  // Verify metadata has proper ID
  TestValidator.predicate(
    "metadata should have valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedMetadata.id,
    ),
  );
}
