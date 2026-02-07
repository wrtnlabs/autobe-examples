import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_archive_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create a section to archive
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 4,
          }),
          description: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Search for existing archives to find one to test with
  // Since we cannot create archives with the available endpoints,
  // we'll search for existing ones and test retrieval functionality
  const archivesPage =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(archivesPage);
  // If there are archives, test retrieval of the first one
  if (archivesPage.data.length > 0) {
    const archiveSummary = archivesPage.data[0];
    // Retrieve the specific archive record
    const archiveRecord =
      await api.functional.discussionBoard.superAdmin.sections.archives.at(
        superAdminConnection,
        {
          sectionId: section.id,
          archiveId: archiveSummary.id,
        },
      );
    typia.assert(archiveRecord);
    // Validate archive record fields
    TestValidator.equals(
      "archive id matches",
      archiveRecord.id,
      archiveSummary.id,
    );
    TestValidator.predicate(
      "archive reason should not be empty",
      archiveRecord.reason.length > 0,
    );
    TestValidator.predicate(
      "archived_at should be valid date",
      new Date(archiveRecord.archived_at).getTime() > 0,
    );
    TestValidator.predicate(
      "created_at should be valid date",
      new Date(archiveRecord.created_at).getTime() > 0,
    );
    TestValidator.predicate(
      "updated_at should be valid date",
      new Date(archiveRecord.updated_at).getTime() > 0,
    );
    // Validate section relationship
    TestValidator.equals(
      "section id matches",
      archiveRecord.section.id,
      section.id,
    );
    TestValidator.predicate(
      "section name should not be empty",
      archiveRecord.section.name.length > 0,
    );
    TestValidator.predicate(
      "section status should be valid",
      ["active", "inactive", "archived"].includes(archiveRecord.section.status),
    );
    TestValidator.predicate(
      "section display order should be positive",
      archiveRecord.section.display_order > 0,
    );
    // Validate administrator relationship
    TestValidator.predicate(
      "archivedByAdmin should have id",
      typeof archiveRecord.archivedByAdmin.id === "string" &&
        archiveRecord.archivedByAdmin.id.length > 0,
    );
    TestValidator.predicate(
      "archivedByAdmin should have email",
      typeof archiveRecord.archivedByAdmin.email === "string" &&
        archiveRecord.archivedByAdmin.email.length > 0,
    );
    TestValidator.predicate(
      "archivedByAdmin should have display_name",
      typeof archiveRecord.archivedByAdmin.display_name === "string" &&
        archiveRecord.archivedByAdmin.display_name.length > 0,
    );
    TestValidator.predicate(
      "archivedByAdmin should have created_at",
      typeof archiveRecord.archivedByAdmin.created_at === "string" &&
        new Date(archiveRecord.archivedByAdmin.created_at).getTime() > 0,
    );
  } else {
    // If no archives exist, test that retrieval fails appropriately
    await TestValidator.error(
      "should fail when archive does not exist",
      async () => {
        await api.functional.discussionBoard.superAdmin.sections.archives.at(
          superAdminConnection,
          {
            sectionId: section.id,
            archiveId: typia.random<string & tags.Format<"uuid">>(),
          },
        );
      },
    );
  }
}
