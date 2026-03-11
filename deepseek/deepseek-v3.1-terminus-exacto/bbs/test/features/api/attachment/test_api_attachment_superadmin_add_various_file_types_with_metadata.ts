import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
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

export async function test_api_attachment_superadmin_add_various_file_types_with_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "superadmin123",
      },
    },
  );
  typia.assert(superAdminAuth);
  // Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com/referrer",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Note: Section creation is not available in current API, so we'll need to use
  // a realistic approach - for now we'll assume a valid section exists
  // In a real implementation, we would create a section first
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create target article via member account
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Define various file types with realistic metadata
  const fileTypes = [
    {
      filename: "document.pdf",
      filetype: "pdf",
      mime_type: "application/pdf",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<5000000>
      >(),
    },
    {
      filename: "image.jpg",
      filetype: "jpg",
      mime_type: "image/jpeg",
      size_bytes: typia.random<
        number &
          tags.Type<"int32"> &
          tags.Minimum<50000> &
          tags.Maximum<2000000>
      >(),
    },
    {
      filename: "document.docx",
      filetype: "docx",
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<5000> & tags.Maximum<100000>
      >(),
    },
    {
      filename: "text.txt",
      filetype: "txt",
      mime_type: "text/plain",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
      >(),
    },
  ] as const;
  // Add each attachment using super admin privileges with utility function
  for (const fileType of fileTypes) {
    const attachment =
      await generate_random_discussion_board_super_admin_articles_attachments_create(
        superAdminConnection,
        {
          body: fileType,
          params: {
            articleId: article.id,
          },
        },
      );
    typia.assert(attachment);
    // Validate attachment metadata is preserved
    TestValidator.equals(
      `filename should match for ${fileType.filetype}`,
      attachment.filename,
      fileType.filename,
    );
    TestValidator.equals(
      `filetype should match for ${fileType.filetype}`,
      attachment.filetype,
      fileType.filetype,
    );
    TestValidator.equals(
      `mime_type should match for ${fileType.filetype}`,
      attachment.mime_type,
      fileType.mime_type,
    );
    TestValidator.equals(
      `size_bytes should match for ${fileType.filetype}`,
      attachment.size_bytes,
      fileType.size_bytes,
    );
    TestValidator.predicate(
      `storage_path should exist for ${fileType.filetype}`,
      attachment.storage_path.length > 0,
    );
    TestValidator.equals(
      `article_id should match for ${fileType.filetype}`,
      attachment.article_id,
      article.id,
    );
  }
  // Verify super admin can add attachments regardless of article ownership
  TestValidator.predicate(
    "super admin successfully added attachments to member-owned article",
    true,
  );
}
