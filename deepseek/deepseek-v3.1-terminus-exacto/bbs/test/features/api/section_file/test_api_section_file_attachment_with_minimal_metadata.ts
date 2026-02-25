import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_admin_sections_files_create } from "../../../generate/generate_random_discussion_board_admin_sections_files_create";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_file_attachment_with_minimal_metadata(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Prepare file attachment data with minimal metadata
  const attachmentFileId = typia.random<string & tags.Format<"uuid">>();
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  // Create file attachment with minimal metadata
  const fileAttachment =
    await api.functional.discussionBoard.admin.sections.files.create(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          attachment_file_id: attachmentFileId,
          display_order: displayOrder,
          alt_text: null,
          caption: null,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // Validate response contains all expected fields with business logic
  TestValidator.equals(
    "attachment file id matches input",
    fileAttachment.attachment_file.id,
    attachmentFileId,
  );
  TestValidator.equals(
    "display order matches input",
    fileAttachment.display_order,
    displayOrder,
  );
  TestValidator.equals(
    "alt text should be null",
    fileAttachment.alt_text,
    null,
  );
  TestValidator.equals("caption should be null", fileAttachment.caption, null);
  TestValidator.predicate(
    "storage path is generated",
    fileAttachment.attachment_file.storage_path.length > 0,
  );
  TestValidator.predicate(
    "mime type is present",
    fileAttachment.attachment_file.mime_type.length > 0,
  );
  TestValidator.predicate(
    "file size is non-negative",
    fileAttachment.attachment_file.file_size >= 0,
  );
  TestValidator.equals("status is set", typeof fileAttachment.status, "string");
  TestValidator.predicate(
    "created at timestamp is valid",
    new Date(fileAttachment.attachment_file.created_at).getTime() > 0,
  );
}
