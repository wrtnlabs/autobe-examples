import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test section snapshot retrieval success path.
 * 1. Administrator joins the system
 * 2. Administrator creates a section
 * 3. Retrieve the section snapshot
 * 4. Validate response structure and data integrity
 */
export async function test_api_section_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Retrieve section snapshot
  const snapshot = await api.functional.discussionBoard.sections.snapshots.at(
    adminConnection,
    {
      sectionId: section.id,
      snapshotId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(snapshot);
  // 4. Validate response
  TestValidator.equals(
    "snapshot section matches",
    snapshot.section.id,
    section.id,
  );
  TestValidator.equals("snapshot name matches", snapshot.name, section.name);
  TestValidator.equals(
    "snapshot description matches",
    snapshot.description,
    section.description,
  );
  TestValidator.predicate(
    "snapshot has valid created_at",
    snapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid section_created_at",
    snapshot.section_created_at.length > 0,
  );
  TestValidator.predicate(
    "snapshot has valid section_updated_at",
    snapshot.section_updated_at.length > 0,
  );
}
