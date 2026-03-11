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
import { generate_random_discussion_board_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_admin_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test filename uniqueness validation within same article.
 * This scenario validates that the system correctly enforces filename uniqueness per article
 * when updating attachment metadata. An administrator should not be able to update an
 * attachment's filename to match another attachment's filename within the same article.
 */
export async function test_api_admin_article_attachment_filename_uniqueness_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Create article as member
  const article = await api.functional.discussionBoard.member.articles.create(
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
  // 3. Create admin connection and register
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 4. Create two attachments with unique filenames
  const firstAttachment =
    await api.functional.discussionBoard.admin.articles.attachments.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          filename: `file_${RandomGenerator.alphaNumeric(8)}.txt`,
          filetype: "txt",
          mime_type: "text/plain",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(firstAttachment);
  const secondAttachment =
    await api.functional.discussionBoard.admin.articles.attachments.create(
      adminConnection,
      {
        articleId: article.id,
        body: {
          filename: `file_${RandomGenerator.alphaNumeric(8)}.pdf`,
          filetype: "pdf",
          mime_type: "application/pdf",
          size_bytes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(secondAttachment);
  // 5. Verify initial filenames are different
  TestValidator.notEquals(
    "initial filenames should be different",
    firstAttachment.filename,
    secondAttachment.filename,
  );
  // 6. Attempt to update second attachment with first attachment's filename
  await TestValidator.error(
    "should reject duplicate filename within same article",
    async () => {
      await api.functional.discussionBoard.admin.articles.attachments.update(
        adminConnection,
        {
          articleId: article.id,
          attachmentId: secondAttachment.id,
          body: {
            filename: firstAttachment.filename,
          } satisfies IDiscussionBoardAttachment.IUpdate,
        },
      );
    },
  );
  // 7. Verify original filenames remain unchanged
  const firstAttachmentAfter =
    await api.functional.discussionBoard.admin.articles.attachments.update(
      adminConnection,
      {
        articleId: article.id,
        attachmentId: firstAttachment.id,
        body: {
          filetype: firstAttachment.filetype,
          mime_type: firstAttachment.mime_type,
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(firstAttachmentAfter);
  TestValidator.equals(
    "first attachment filename should remain unchanged",
    firstAttachmentAfter.filename,
    firstAttachment.filename,
  );
  const secondAttachmentAfter =
    await api.functional.discussionBoard.admin.articles.attachments.update(
      adminConnection,
      {
        articleId: article.id,
        attachmentId: secondAttachment.id,
        body: {
          filetype: secondAttachment.filetype,
          mime_type: secondAttachment.mime_type,
        } satisfies IDiscussionBoardAttachment.IUpdate,
      },
    );
  typia.assert(secondAttachmentAfter);
  TestValidator.equals(
    "second attachment filename should remain unchanged",
    secondAttachmentAfter.filename,
    secondAttachment.filename,
  );
}
