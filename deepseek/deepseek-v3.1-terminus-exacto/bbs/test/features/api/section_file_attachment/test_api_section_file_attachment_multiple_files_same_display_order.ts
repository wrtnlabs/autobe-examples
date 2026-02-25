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

export async function test_api_section_file_attachment_multiple_files_same_display_order(
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
  // Create a section for file attachments
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Generate consistent attachment metadata for both files to focus on display_order testing
  const sharedAltText = RandomGenerator.paragraph({ sentences: 1 });
  const sharedCaption = RandomGenerator.paragraph({ sentences: 2 });
  // Create first file attachment with display_order = 1
  const firstFile =
    await generate_random_discussion_board_admin_sections_files_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: 1 satisfies number as number & tags.Type<"int32">,
          alt_text: sharedAltText,
          caption: sharedCaption,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(firstFile);
  // Create second file attachment with same display_order = 1
  const secondFile =
    await generate_random_discussion_board_admin_sections_files_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          attachment_file_id: typia.random<string & tags.Format<"uuid">>(),
          display_order: 1 satisfies number as number & tags.Type<"int32">,
          alt_text: sharedAltText,
          caption: sharedCaption,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(secondFile);
  // Verify both files were successfully created with identical display_order values
  TestValidator.equals(
    "first file has correct display_order",
    firstFile.display_order,
    1,
  );
  TestValidator.equals(
    "second file has correct display_order",
    secondFile.display_order,
    1,
  );
  // Verify both files have distinct IDs and storage paths
  TestValidator.notEquals(
    "files have distinct IDs",
    firstFile.id,
    secondFile.id,
  );
  TestValidator.notEquals(
    "files have distinct storage paths",
    firstFile.attachment_file.storage_path,
    secondFile.attachment_file.storage_path,
  );
  // Validate that both files can coexist without errors (primary test objective)
  TestValidator.predicate(
    "system allows duplicate display_order for same section",
    firstFile.display_order === secondFile.display_order &&
      firstFile.id !== secondFile.id,
  );
}
