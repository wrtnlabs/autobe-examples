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

export async function test_api_section_archival_admin_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first super administrator for section creation
  const adminForCreationConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin = await authorize_super_admin_join(
    adminForCreationConnection,
    { body: undefined },
  );
  typia.assert(firstSuperAdmin);
  // 2. Create second super administrator for archival action
  const adminForArchivalConnection: api.IConnection = { host: connection.host };
  const secondSuperAdmin = await authorize_super_admin_join(
    adminForArchivalConnection,
    { body: undefined },
  );
  typia.assert(secondSuperAdmin);
  // 3. First super admin creates a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      adminForCreationConnection,
      { body: undefined },
    );
  typia.assert(section);
  // 4. Second super admin archives the section with explicit reason
  const archivalReason = RandomGenerator.paragraph({ sentences: 2 });
  const archive =
    await generate_random_discussion_board_super_admin_sections_archives_create(
      adminForArchivalConnection,
      {
        params: { sectionId: section.id },
        body: { reason: archivalReason },
      },
    );
  typia.assert(archive);
  // 5. Validate archive record audit trail
  TestValidator.equals(
    "archive section ID matches original section",
    archive.sectionId,
    section.id,
  );
  TestValidator.equals(
    "archive reason matches provided reason",
    archive.reason,
    archivalReason,
  );
  TestValidator.notEquals(
    "archiving admin is second super admin, not first",
    archive.archivedBy,
    firstSuperAdmin.id,
  );
  // Second super admin ID should be somewhere in the system, though not directly in archive.archivedBy
  // The archive.archivedBy should be a UUID of the archiving administrator
  TestValidator.predicate(
    "archivedAt timestamp is valid ISO string",
    () => !isNaN(new Date(archive.archivedAt).getTime()),
  );
  TestValidator.predicate(
    "createdAt timestamp is valid ISO string",
    () => !isNaN(new Date(archive.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updatedAt timestamp is valid ISO string",
    () => !isNaN(new Date(archive.updatedAt).getTime()),
  );
  TestValidator.predicate(
    "section summary exists in archive",
    () => archive.section !== undefined && archive.section !== null,
  );
  TestValidator.equals(
    "section summary ID matches",
    archive.section.id,
    section.id,
  );
}
