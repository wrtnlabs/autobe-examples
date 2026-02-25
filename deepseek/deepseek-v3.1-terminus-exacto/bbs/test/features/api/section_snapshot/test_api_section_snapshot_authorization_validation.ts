import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_snapshot_authorization_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create first administrator account
  const admin1JoinConnection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1JoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: "Admin One",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create authenticated connection for admin1
  const admin1Connection: api.IConnection = { host: connection.host };
  admin1Connection.headers = { Authorization: admin1Auth.token.access };
  // Create first section with admin1
  const section1 = await generate_random_discussion_board_admin_sections_create(
    admin1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  // Create snapshot for section1
  const snapshot1 =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      admin1Connection,
      {
        sectionId: section1.id,
      },
    );
  typia.assert(snapshot1);
  // Create second administrator account
  const admin2JoinConnection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2JoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin456",
      display_name: "Admin Two",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create authenticated connection for admin2
  const admin2Connection: api.IConnection = { host: connection.host };
  admin2Connection.headers = { Authorization: admin2Auth.token.access };
  // Create second section with admin2
  const section2 = await generate_random_discussion_board_admin_sections_create(
    admin2Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<11> & tags.Maximum<20>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // Create snapshot for section2
  const snapshot2 =
    await api.functional.discussionBoard.admin.sections.snapshots.create(
      admin2Connection,
      {
        sectionId: section2.id,
      },
    );
  typia.assert(snapshot2);
  // Test 1: Admin1 should be able to access their own section's snapshot
  const admin1SnapshotAccess =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      admin1Connection,
      {
        sectionId: section1.id,
        snapshotId: snapshot1.id,
      },
    );
  typia.assert(admin1SnapshotAccess);
  TestValidator.equals(
    "admin1 can access own snapshot",
    admin1SnapshotAccess.id,
    snapshot1.id,
  );
  // Test 2: Admin2 should be able to access their own section's snapshot
  const admin2SnapshotAccess =
    await api.functional.discussionBoard.admin.sections.snapshots.at(
      admin2Connection,
      {
        sectionId: section2.id,
        snapshotId: snapshot2.id,
      },
    );
  typia.assert(admin2SnapshotAccess);
  TestValidator.equals(
    "admin2 can access own snapshot",
    admin2SnapshotAccess.id,
    snapshot2.id,
  );
  // Test 3: Admin1 should NOT be able to access admin2's section snapshot
  await TestValidator.error(
    "admin1 cannot access admin2's snapshot",
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        admin1Connection,
        {
          sectionId: section2.id,
          snapshotId: snapshot2.id,
        },
      );
    },
  );
  // Test 4: Admin2 should NOT be able to access admin1's section snapshot
  await TestValidator.error(
    "admin2 cannot access admin1's snapshot",
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        admin2Connection,
        {
          sectionId: section1.id,
          snapshotId: snapshot1.id,
        },
      );
    },
  );
  // Test 5: Regular user should NOT be able to access any section snapshot
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: userAuth.token.access };
  await TestValidator.error(
    "regular user cannot access section1 snapshot",
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        userConnection,
        {
          sectionId: section1.id,
          snapshotId: snapshot1.id,
        },
      );
    },
  );
  await TestValidator.error(
    "regular user cannot access section2 snapshot",
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        userConnection,
        {
          sectionId: section2.id,
          snapshotId: snapshot2.id,
        },
      );
    },
  );
  // Test 6: Test with non-existent snapshot ID
  await TestValidator.error(
    "admin1 cannot access non-existent snapshot",
    async () => {
      await api.functional.discussionBoard.admin.sections.snapshots.at(
        admin1Connection,
        {
          sectionId: section1.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
