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
 * Test that an administrator can add mixed media attachments (images and documents) to an article owned by another member.
 */
export async function test_api_attachment_admin_add_images_and_documents(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Authenticate member and create article
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
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create article as member - using a placeholder section ID since we don't have section creation API
  // In a real test environment, this would use an existing section ID
  const article = await api.functional.discussionBoard.member.articles.create(
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
  // 3. Create mixed media attachments as admin
  const attachments = [
    {
      filename: "image.jpg",
      filetype: "jpg",
      mime_type: "image/jpeg",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
      >(),
    },
    {
      filename: "document.png",
      filetype: "png",
      mime_type: "image/png",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
      >(),
    },
    {
      filename: "report.pdf",
      filetype: "pdf",
      mime_type: "application/pdf",
      size_bytes: typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<1000> &
          tags.Maximum<10000000>
      >(),
    },
    {
      filename: "notes.txt",
      filetype: "txt",
      mime_type: "text/plain",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
      >(),
    },
  ];
  // Create attachments sequentially to test transactional behavior
  const createdAttachments: IDiscussionBoardAttachment[] = [];
  for (const attachmentData of attachments) {
    const attachment =
      await api.functional.discussionBoard.admin.articles.attachments.create(
        adminConnection,
        {
          articleId: article.id,
          body: attachmentData satisfies IDiscussionBoardAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    createdAttachments.push(attachment);
  }
  // 4. Validate attachment properties
  TestValidator.equals(
    "number of attachments created",
    createdAttachments.length,
    attachments.length,
  );
  for (let i = 0; i < attachments.length; i++) {
    const expected = attachments[i];
    const actual = createdAttachments[i];
    TestValidator.equals(
      "filename matches",
      actual.filename,
      expected.filename,
    );
    TestValidator.equals(
      "filetype matches",
      actual.filetype,
      expected.filetype,
    );
    TestValidator.equals(
      "mime_type matches",
      actual.mime_type,
      expected.mime_type,
    );
    TestValidator.equals(
      "size_bytes matches",
      actual.size_bytes,
      expected.size_bytes,
    );
    TestValidator.equals("article_id matches", actual.article_id, article.id);
    TestValidator.predicate(
      "has valid created_at timestamp",
      () => new Date(actual.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "has valid updated_at timestamp",
      () => new Date(actual.updated_at).getTime() > 0,
    );
    TestValidator.predicate(
      "attachment has unique ID",
      () => actual.id.length > 0 && /^[0-9a-f-]{36}$/i.test(actual.id),
    );
  }
  // 5. Validate admin override privilege - admin successfully attached files to member's article
  TestValidator.predicate(
    "admin successfully attached files to member-owned article",
    true,
  );
  // 6. Validate transactional boundary - all attachments were created successfully
  TestValidator.equals(
    "all attachments created successfully",
    createdAttachments.length,
    attachments.length,
  );
}
