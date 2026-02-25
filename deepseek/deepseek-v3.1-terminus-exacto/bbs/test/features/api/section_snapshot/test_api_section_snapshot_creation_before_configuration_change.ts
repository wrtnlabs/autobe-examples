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

export async function test_api_section_snapshot_creation_before_configuration_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup using utility function
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
  // 2. Create initial section
  const initialSection =
    await api.functional.discussionBoard.admin.sections.create(
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
  typia.assert(initialSection);
  // 3. Create snapshot before modification
  const snapshot =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      adminConnection,
      {
        sectionId: initialSection.id,
      },
    );
  typia.assert(snapshot);
  // 4. Modify section configuration
  const updateData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "inactive" as const,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IDiscussionBoardSection.IUpdate;
  const updatedSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: initialSection.id,
        body: updateData,
      },
    );
  typia.assert(updatedSection);
  // 5. Validate snapshot preserves original section state
  TestValidator.equals(
    "snapshot name matches original section",
    snapshot.name,
    initialSection.name,
  );
  TestValidator.equals(
    "snapshot description matches original section",
    snapshot.description,
    initialSection.description,
  );
  TestValidator.equals(
    "snapshot references correct section",
    snapshot.discussion_board_section_id,
    initialSection.id,
  );
  // 6. Verify section was actually modified
  TestValidator.notEquals(
    "section name changed after snapshot",
    initialSection.name,
    updatedSection.name,
  );
  TestValidator.notEquals(
    "section description changed after snapshot",
    initialSection.description,
    updatedSection.description,
  );
  TestValidator.notEquals(
    "section status changed after snapshot",
    initialSection.status,
    updatedSection.status,
  );
  TestValidator.notEquals(
    "section display order changed after snapshot",
    initialSection.display_order,
    updatedSection.display_order,
  );
  // 7. Validate snapshot timestamp integrity
  TestValidator.predicate(
    "snapshot has valid creation timestamp",
    new Date(snapshot.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "snapshot has valid update timestamp",
    new Date(snapshot.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "snapshot deleted_at is null",
    snapshot.deleted_at,
    null,
  );
}
