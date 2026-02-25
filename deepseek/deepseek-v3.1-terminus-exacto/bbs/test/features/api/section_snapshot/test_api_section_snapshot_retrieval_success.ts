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
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_snapshot_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create a snapshot of the section
  const snapshot =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      adminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(snapshot);
  // 4. Retrieve the snapshot using the specific endpoint
  const retrievedSnapshot =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: section.id,
        snapshotId: snapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Validate snapshot fields
  TestValidator.equals(
    "snapshot ID matches",
    retrievedSnapshot.id,
    snapshot.id,
  );
  TestValidator.equals(
    "snapshot name matches section",
    retrievedSnapshot.name,
    section.name,
  );
  TestValidator.equals(
    "snapshot description matches section",
    retrievedSnapshot.description,
    section.description,
  );
  TestValidator.equals(
    "section foreign key correct",
    retrievedSnapshot.discussion_board_section_id,
    section.id,
  );
  TestValidator.predicate(
    "created at timestamp present",
    retrievedSnapshot.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp present",
    retrievedSnapshot.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted at is null for active snapshot",
    retrievedSnapshot.deleted_at,
    null,
  );
  // 6. Validate timestamps are ISO format
  TestValidator.predicate(
    "created at is valid ISO string",
    !isNaN(Date.parse(retrievedSnapshot.created_at)),
  );
  TestValidator.predicate(
    "updated at is valid ISO string",
    !isNaN(Date.parse(retrievedSnapshot.updated_at)),
  );
}
