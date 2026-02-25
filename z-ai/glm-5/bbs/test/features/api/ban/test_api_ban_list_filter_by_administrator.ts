import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_bans_create } from "../../../generate/generate_random_discussion_board_bans_create";
import { generate_random_discussion_board_user_admin_requests_create } from "../../../generate/generate_random_discussion_board_user_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";
import { prepare_random_discussion_board_ban } from "../../../prepare/prepare_random_discussion_board_ban";

export async function test_api_ban_list_filter_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create Super Administrator (for approving admin requests)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_user_join(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "TestPassword123!",
      displayName: "Super Administrator",
    },
  });
  typia.assert(superAdmin);
  // Step 2: Create Admin A and request admin privileges
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA = await authorize_user_join(adminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminAPassword123!",
      displayName: "Administrator A",
    },
  });
  typia.assert(adminA);
  const adminRequestA =
    await generate_random_discussion_board_user_admin_requests_create(
      adminAConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 10 }),
        },
      },
    );
  typia.assert(adminRequestA);
  // Step 3: Approve Admin A's request (using super admin connection)
  const approvedRequestA =
    await api.functional.discussionBoard.user.adminRequests.approve(
      superAdminConnection,
      {
        adminRequestId: adminRequestA.id,
        body: {
          reviewNotes: "Approved for testing purposes",
        } satisfies IDiscussionBoardAdminRequest.IApprove,
      },
    );
  typia.assert(approvedRequestA);
  // Step 4: Create Admin B and request admin privileges
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_user_join(adminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminBPassword123!",
      displayName: "Administrator B",
    },
  });
  typia.assert(adminB);
  const adminRequestB =
    await generate_random_discussion_board_user_admin_requests_create(
      adminBConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 10 }),
        },
      },
    );
  typia.assert(adminRequestB);
  // Step 5: Approve Admin B's request (using super admin connection)
  const approvedRequestB =
    await api.functional.discussionBoard.user.adminRequests.approve(
      superAdminConnection,
      {
        adminRequestId: adminRequestB.id,
        body: {
          reviewNotes: "Approved for testing purposes",
        } satisfies IDiscussionBoardAdminRequest.IApprove,
      },
    );
  typia.assert(approvedRequestB);
  // Step 6: Create User 1 (to be banned by Admin A)
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "User1Password123!",
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(user1);
  // Step 7: Admin A bans User 1
  const ban1 = await generate_random_discussion_board_bans_create(
    adminAConnection,
    {
      body: {
        userId: user1.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(ban1);
  // Step 8: Create User 2 (to be banned by Admin B)
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "User2Password123!",
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(user2);
  // Step 9: Admin B bans User 2
  const ban2 = await generate_random_discussion_board_bans_create(
    adminBConnection,
    {
      body: {
        userId: user2.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(ban2);
  // Step 10: Create User 3 (to be banned by Admin A for multiple bans test)
  const user3Connection: api.IConnection = { host: connection.host };
  const user3 = await authorize_user_join(user3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "User3Password123!",
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(user3);
  // Step 11: Admin A bans User 3
  const ban3 = await generate_random_discussion_board_bans_create(
    adminAConnection,
    {
      body: {
        userId: user3.id,
        reason: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(ban3);
  // Step 12: Test filtering by Admin A's ID
  const filteredBans = await api.functional.discussionBoard.bans.index(
    adminAConnection,
    {
      body: {
        administratorId: adminA.id,
      } satisfies IDiscussionBoardBan.IRequest,
    },
  );
  typia.assert(filteredBans);
  // Step 13: Verify pagination and record count
  TestValidator.equals(
    "pagination current page",
    filteredBans.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count is at least 2",
    filteredBans.pagination.records >= 2,
  );
  // Step 14: Verify all returned bans have administrator matching Admin A's ID
  TestValidator.predicate(
    "all bans have correct administrator",
    filteredBans.data.every((ban) => ban.administrator?.id === adminA.id),
  );
  // Step 15: Verify no bans from Admin B are included
  TestValidator.predicate(
    "no bans from Admin B",
    filteredBans.data.every((ban) => ban.administrator?.id !== adminB.id),
  );
  // Step 16: Verify banned user information is populated
  for (const ban of filteredBans.data) {
    TestValidator.predicate(
      "banned user exists",
      ban.user !== null && ban.user !== undefined,
    );
    TestValidator.predicate(
      "banned user has displayName",
      ban.user.displayName.length > 0,
    );
    TestValidator.predicate("banned user has email", ban.user.email.length > 0);
  }
}
