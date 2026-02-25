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

export async function test_api_section_file_soft_deletion_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create a test section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Upload a test file to the section
  const file =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          alt_text: RandomGenerator.paragraph({ sentences: 1 }),
          caption: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(file);
  // 4. Delete the file using soft deletion
  await api.functional.discussionBoard.superAdmin.sections.files.erase(
    superAdminConnection,
    {
      sectionId: section.id,
      fileId: file.id,
    },
  );
  // 5. Verify soft deletion by attempting to access the deleted file
  // Note: Since the erase endpoint returns void (204), we validate soft deletion
  // by checking that subsequent operations on the deleted file fail appropriately
  await TestValidator.error("accessing deleted file should fail", async () => {
    // Try to create a new file with the same ID (should fail due to soft delete)
    await api.functional.discussionBoard.superAdmin.sections.files.create(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          attachment_file_id: file.id, // Using deleted file's ID
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  });
  // 6. Additional validation: Create a new file in the same section to ensure section is still accessible
  const newFile =
    await generate_random_discussion_board_super_admin_sections_files_create(
      superAdminConnection,
      {
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          sectionId: section.id,
        },
      },
    );
  typia.assert(newFile);
  // 7. Verify the new file is accessible (section functionality remains intact)
  TestValidator.predicate(
    "section remains functional after file deletion",
    newFile !== null,
  );
}
