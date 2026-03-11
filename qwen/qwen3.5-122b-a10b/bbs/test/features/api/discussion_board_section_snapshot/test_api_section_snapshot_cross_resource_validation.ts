import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
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

export async function test_api_section_snapshot_cross_resource_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create two separate sections
  const section1 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  const section2 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // 3. Retrieve snapshot lists from both sections
  const snapshots1 =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section1.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshots1);
  const snapshots2 =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section2.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshots2);
  // Ensure we have snapshots to test with
  TestValidator.predicate(
    "section 1 has snapshots",
    snapshots1.data.length > 0,
  );
  TestValidator.predicate(
    "section 2 has snapshots",
    snapshots2.data.length > 0,
  );
  const snapshot1Id = snapshots1.data[0].id;
  const snapshot2Id = snapshots2.data[0].id;
  // 4. Attempt to retrieve snapshot from section 1 using section 2's ID
  // This should fail with 404 because the snapshot doesn't belong to section 2
  await TestValidator.httpError(
    "cross-resource access should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        adminConnection,
        {
          sectionId: section2.id,
          snapshotId: snapshot1Id,
        },
      );
    },
  );
  // 5. Verify the reverse case also fails
  await TestValidator.httpError(
    "cross-resource access should return 404 (reverse)",
    404,
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        adminConnection,
        {
          sectionId: section1.id,
          snapshotId: snapshot2Id,
        },
      );
    },
  );
  // 6. Verify valid access still works (snapshot from correct section)
  const validSnapshot1 =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: section1.id,
        snapshotId: snapshot1Id,
      },
    );
  typia.assert(validSnapshot1);
  TestValidator.equals(
    "snapshot belongs to correct section",
    validSnapshot1.discussion_board_section_id,
    section1.id,
  );
  const validSnapshot2 =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      adminConnection,
      {
        sectionId: section2.id,
        snapshotId: snapshot2Id,
      },
    );
  typia.assert(validSnapshot2);
  TestValidator.equals(
    "snapshot belongs to correct section",
    validSnapshot2.discussion_board_section_id,
    section2.id,
  );
}
