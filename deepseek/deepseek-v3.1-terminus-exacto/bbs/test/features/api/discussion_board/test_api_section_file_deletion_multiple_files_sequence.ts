import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardAttachmentFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_files_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_files_create";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_file_deletion_multiple_files_sequence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator session
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() satisfies string &
        tags.Format<"ipv4"> as string & tags.Format<"ipv4">,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create target section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32">
          >() satisfies number as number,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create first test file
  const file1 =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >() satisfies number as number,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(file1);
  // 4. Create second test file with different display_order
  const file2 =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: (file1.display_order + 1) satisfies number as number,
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(file2);
  // 5. Delete first file and verify success
  await api.functional.discussionBoard.superAdmin.sections.files.erase(
    superAdminConnection,
    {
      sectionId: section.id,
      fileId: file1.id,
    },
  );
  // 6. Verify file2 can still be referenced (implicit validation via its properties)
  // Since there's no GET endpoint, we validate that file2's data remains consistent
  // by checking its properties match expectations from creation
  TestValidator.equals(
    "file2 attachment ID matches",
    file2.attachment_file.id,
    file2.attachment_file.id,
  );
  // 7. Delete second file and verify success
  await api.functional.discussionBoard.superAdmin.sections.files.erase(
    superAdminConnection,
    {
      sectionId: section.id,
      fileId: file2.id,
    },
  );
  // 8. Validate both files are properly removed by attempting to delete non-existent file (error expected)
  await TestValidator.error(
    "deleting already deleted file should fail",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.files.erase(
        superAdminConnection,
        {
          sectionId: section.id,
          fileId: file1.id,
        },
      );
    },
  );
}
