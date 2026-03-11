import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
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
import { generate_random_discussion_board_admin_sections_snapshots_create } from "../../../generate/generate_random_discussion_board_admin_sections_snapshots_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_snapshot_retrieval_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a new section
  const sectionBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardSection.ICreate;
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    { body: sectionBody },
  );
  typia.assert(section);
  // 3. Create a manual snapshot of the section
  const snapshotBody = {
    name: section.name,
    description: section.description,
  } satisfies IDiscussionBoardSection.ICreate;
  const snapshot =
    await generate_random_discussion_board_admin_sections_snapshots_create(
      adminConnection,
      {
        body: snapshotBody,
        params: { sectionId: section.id },
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the snapshot using section ID and snapshot ID
  const retrievedSnapshot =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: section.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate snapshot content matches original section configuration
  TestValidator.equals(
    "snapshot name matches section name",
    retrievedSnapshot.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot description matches section description",
    retrievedSnapshot.description,
    section.description,
  );
  // 6. Validate snapshot metadata
  TestValidator.predicate("snapshot has valid creation timestamp", () => {
    const snapshotDate = new Date(retrievedSnapshot.created_at);
    return !isNaN(snapshotDate.getTime());
  });
  // 7. Validate section relationship
  TestValidator.equals(
    "snapshot belongs to correct section",
    retrievedSnapshot.section.id,
    section.id,
  );
  TestValidator.equals(
    "snapshot section name matches",
    retrievedSnapshot.section.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot section description matches",
    retrievedSnapshot.section.description,
    section.description,
  );
  // 8. Validate snapshot ID matches
  TestValidator.equals(
    "retrieved snapshot ID matches created snapshot ID",
    retrievedSnapshot.id,
    snapshot.id,
  );
}
