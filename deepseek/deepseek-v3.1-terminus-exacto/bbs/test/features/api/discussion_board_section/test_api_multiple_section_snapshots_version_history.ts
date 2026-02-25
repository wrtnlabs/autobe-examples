import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
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
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_multiple_section_snapshots_version_history(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "https://localhost:3000",
      referrer: "https://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create initial section
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create first snapshot after initial creation
  const snapshot1 =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.create(
      superAdminConnection,
      { sectionId: section.id },
    );
  typia.assert(snapshot1);
  // First modification - update section name
  const updatedSection1 =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          name: RandomGenerator.name(),
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection1);
  // Create second snapshot after first modification
  const snapshot2 =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.create(
      superAdminConnection,
      { sectionId: section.id },
    );
  typia.assert(snapshot2);
  // Second modification - update section description
  const updatedSection2 =
    await api.functional.discussionBoard.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection2);
  // Create third snapshot after second modification
  const snapshot3 =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.create(
      superAdminConnection,
      { sectionId: section.id },
    );
  typia.assert(snapshot3);
  // Validate that each snapshot captures the correct state at the time of creation
  TestValidator.equals(
    "first snapshot name matches initial section",
    snapshot1.name,
    section.name,
  );
  TestValidator.equals(
    "first snapshot description matches initial section",
    snapshot1.description,
    section.description,
  );
  TestValidator.equals(
    "second snapshot name matches first update",
    snapshot2.name,
    updatedSection1.name,
  );
  TestValidator.equals(
    "second snapshot description matches first update",
    snapshot2.description,
    updatedSection1.description,
  );
  TestValidator.equals(
    "third snapshot name matches second update",
    snapshot3.name,
    updatedSection2.name,
  );
  TestValidator.equals(
    "third snapshot description matches second update",
    snapshot3.description,
    updatedSection2.description,
  );
  // Validate that snapshots have different content demonstrating version history
  TestValidator.notEquals(
    "snapshot1 and snapshot2 have different names",
    snapshot1.name,
    snapshot2.name,
  );
  TestValidator.notEquals(
    "snapshot2 and snapshot3 have different descriptions",
    snapshot2.description,
    snapshot3.description,
  );
  // Validate timestamps and unique IDs
  TestValidator.predicate(
    "all snapshots have unique IDs",
    [snapshot1.id, snapshot2.id, snapshot3.id].length ===
      new Set([snapshot1.id, snapshot2.id, snapshot3.id]).size,
  );
  TestValidator.predicate(
    "all snapshots reference the same section",
    snapshot1.discussion_board_section_id === section.id &&
      snapshot2.discussion_board_section_id === section.id &&
      snapshot3.discussion_board_section_id === section.id,
  );
}
