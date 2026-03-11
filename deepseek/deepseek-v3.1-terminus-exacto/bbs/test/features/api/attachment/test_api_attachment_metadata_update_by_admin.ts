import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

export async function test_api_attachment_metadata_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member author
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
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
  typia.assert(author);
  // 2. Create article as author
  const article = await api.functional.discussionBoard.member.articles.create(
    authorConnection,
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
  // 3. Add attachment to article
  const originalAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      authorConnection,
      {
        articleId: article.id,
        body: {
          filename: `test-file-${RandomGenerator.alphabets(5)}.txt`,
          filetype: "txt",
          mime_type: "text/plain",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(originalAttachment);
  // 4. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 5. Test that regular member cannot update attachment they don't own
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
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
  typia.assert(otherMember);
  await TestValidator.error(
    "regular member should not update attachment they don't own",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.update(
        otherMemberConnection,
        {
          articleId: article.id,
          attachmentId: originalAttachment.id,
          body: {
            filename: "unauthorized-update.txt",
          } satisfies IDiscussionBoardAttachment.IUpdate,
        },
      );
    },
  );
  // 6. Update attachment metadata as admin
  const updatedMetadata = {
    filename: `updated-${originalAttachment.filename}`,
    filetype: "pdf",
    mime_type: "application/pdf",
  } satisfies IDiscussionBoardAttachment.IUpdate;
  const updatedAttachment =
    await api.functional.discussionBoard.member.articles.attachments.update(
      adminConnection,
      {
        articleId: article.id,
        attachmentId: originalAttachment.id,
        body: updatedMetadata,
      },
    );
  typia.assert(updatedAttachment);
  // 7. Validate metadata was updated
  TestValidator.equals(
    "filename should be updated",
    updatedAttachment.filename,
    updatedMetadata.filename,
  );
  TestValidator.equals(
    "filetype should be updated",
    updatedAttachment.filetype,
    updatedMetadata.filetype,
  );
  TestValidator.equals(
    "mime_type should be updated",
    updatedAttachment.mime_type,
    updatedMetadata.mime_type,
  );
  // Verify system-managed fields remain unchanged
  TestValidator.equals(
    "id should remain the same",
    updatedAttachment.id,
    originalAttachment.id,
  );
  TestValidator.equals(
    "size_bytes should remain the same",
    updatedAttachment.size_bytes,
    originalAttachment.size_bytes,
  );
  TestValidator.equals(
    "article_id should remain the same",
    updatedAttachment.article_id,
    originalAttachment.article_id,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    new Date(updatedAttachment.updated_at) >
      new Date(originalAttachment.updated_at),
  );
}
