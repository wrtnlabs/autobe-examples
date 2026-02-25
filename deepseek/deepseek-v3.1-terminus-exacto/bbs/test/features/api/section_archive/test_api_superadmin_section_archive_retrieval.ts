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

export async function test_api_superadmin_section_archive_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
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
  // Create a section to archive
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Archive the section
  const archiveReason = RandomGenerator.paragraph({ sentences: 1 });
  const archive =
    await generate_random_discussion_board_super_admin_sections_archives_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          reason: archiveReason,
        } satisfies IDiscussionBoardSectionArchive.ICreate,
      },
    );
  typia.assert(archive);
  // Retrieve the archived section record
  const retrievedArchive =
    await api.functional.discussionBoard.superAdmin.sections.archives.at(
      superAdminConnection,
      { archiveId: archive.id },
    );
  typia.assert(retrievedArchive);
  // Validate archival metadata
  TestValidator.equals("archive ID matches", retrievedArchive.id, archive.id);
  TestValidator.equals(
    "section ID matches",
    retrievedArchive.sectionId,
    section.id,
  );
  TestValidator.equals(
    "reason preserved",
    retrievedArchive.reason,
    archiveReason,
  );
  TestValidator.predicate(
    "has archived timestamp",
    new Date(retrievedArchive.archivedAt) instanceof Date,
  );
  TestValidator.predicate(
    "has correct archivedBy format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedArchive.archivedBy,
    ),
  );
  // Validate section summary integrity
  TestValidator.equals(
    "section ID integrity",
    retrievedArchive.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name integrity",
    retrievedArchive.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description integrity",
    retrievedArchive.section.description,
    section.description,
  );
  TestValidator.equals(
    "section display order integrity",
    retrievedArchive.section.display_order,
    section.display_order,
  );
  // Validate creation timestamps
  TestValidator.predicate(
    "has createdAt",
    new Date(retrievedArchive.createdAt) instanceof Date,
  );
  TestValidator.predicate(
    "has updatedAt",
    new Date(retrievedArchive.updatedAt) instanceof Date,
  );
}
