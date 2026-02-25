import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_archives_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_archives_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_archive } from "../../../prepare/prepare_random_discussion_board_section_archive";

/**
 * Test a complete section archival workflow starting with super administrator authentication and section creation. First, create a new super administrator account using the join endpoint to establish authentication context. Then create a temporary section using the super administrator's credentials. Finally, call the archival endpoint with a valid archival reason. Validate that the section status is properly updated to 'archived', the archive record contains the correct reason and administrator reference, and that the section can no longer receive new content while preserving existing articles.
 */
export async function test_api_section_archival_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super administrator connection and account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Step 2: Create a section to archive
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        },
      },
    );
  typia.assert(section);
  // Step 3: Archive the section
  const archiveReason = RandomGenerator.paragraph({ sentences: 3 });
  const archive =
    await generate_random_discussion_board_super_admin_sections_archives_create(
      superAdminConnection,
      {
        body: { reason: archiveReason },
        params: { sectionId: section.id },
      },
    );
  typia.assert(archive);
  // Step 4: Validate archival results (business logic only)
  TestValidator.equals("section ID matches", archive.sectionId, section.id);
  TestValidator.equals("archive reason matches", archive.reason, archiveReason);
  TestValidator.equals(
    "archived by matches super admin ID",
    archive.archivedBy,
    superAdmin.id,
  );
  TestValidator.equals(
    "section status is archived",
    archive.section.status,
    "archived",
  );
  // Validate that the archived section summary contains the correct basic info
  TestValidator.equals(
    "section name preserved in archive",
    archive.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description preserved in archive",
    archive.section.description,
    section.description,
  );
  TestValidator.equals(
    "section display order preserved in archive",
    archive.section.display_order,
    section.display_order,
  );
}
