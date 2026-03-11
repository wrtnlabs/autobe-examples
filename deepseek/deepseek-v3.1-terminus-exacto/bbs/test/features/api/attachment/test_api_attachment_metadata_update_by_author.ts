import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
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

export async function test_api_attachment_metadata_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Create and authenticate member
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
  // 2. Create article with a valid section ID (using random UUID as placeholder)
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
  // 3. Create attachment
  const originalAttachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          filename: RandomGenerator.name() + ".txt",
          filetype: "txt",
          mime_type: "text/plain",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(originalAttachment);
  // 4. Update attachment metadata
  const updateData = {
    filename: "updated_filename.pdf",
    filetype: "pdf",
    mime_type: "application/pdf",
  } satisfies IDiscussionBoardAttachment.IUpdate;
  const updatedAttachment =
    await api.functional.discussionBoard.member.articles.attachments.update(
      memberConnection,
      {
        articleId: article.id,
        attachmentId: originalAttachment.id,
        body: updateData,
      },
    );
  typia.assert(updatedAttachment);
  // 5. Validate metadata updates
  TestValidator.equals(
    "filename updated",
    updatedAttachment.filename,
    updateData.filename,
  );
  TestValidator.equals(
    "filetype updated",
    updatedAttachment.filetype,
    updateData.filetype,
  );
  TestValidator.equals(
    "mime_type updated",
    updatedAttachment.mime_type,
    updateData.mime_type,
  );
  // 6. Validate system-managed fields remain unchanged
  TestValidator.equals(
    "storage_path unchanged",
    updatedAttachment.storage_path,
    originalAttachment.storage_path,
  );
  TestValidator.equals(
    "size_bytes unchanged",
    updatedAttachment.size_bytes,
    originalAttachment.size_bytes,
  );
  TestValidator.equals(
    "article_id unchanged",
    updatedAttachment.article_id,
    originalAttachment.article_id,
  );
  // 7. Validate timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedAttachment.created_at,
    originalAttachment.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedAttachment.updated_at,
    originalAttachment.updated_at,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(updatedAttachment.updated_at) >
      new Date(originalAttachment.updated_at),
  );
}
