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

export async function test_api_section_snapshot_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin_password_123",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Test Section",
        description: "Test section description",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create snapshot with proper admin authorization
  const snapshot =
    await generate_random_discussion_board_admin_sections_snapshots_create(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: {
          name: "Snapshot Section Name",
          description: "Snapshot section description",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contains correct section data
  TestValidator.equals(
    "snapshot section ID matches",
    snapshot.section.id,
    section.id,
  );
  TestValidator.equals(
    "snapshot section name matches",
    snapshot.section.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot section description matches",
    snapshot.section.description,
    section.description,
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at !== undefined,
  );
}
