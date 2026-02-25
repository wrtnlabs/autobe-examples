import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_bans_appeal_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // Create a user for ban testing
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        display_name: typia.random<string>(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  // Create a ban using the utility function
  const ban = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: user.id,
        banReason: typia.random<string & tags.MinLength<10>>(),
        banDurationType: "temporary",
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(ban);
  // Test appeal status filtering with the default status (likely "none")
  const response = await api.functional.discussionBoard.admin.user_bans.index(
    adminConnection,
    {
      body: {
        appealStatus: "none",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(response);
  // Verify the response structure and content
  TestValidator.predicate(
    "response contains pagination data",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "response contains data array",
    Array.isArray(response.data),
  );
  // Test with null appeal status (should return all bans)
  const allBansResponse =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          appealStatus: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(allBansResponse);
  // Test combination of filters
  const comboResponse =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          banStatus: "active",
          appealStatus: "none",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(comboResponse);
  // Verify nested user and administrator information in results
  if (comboResponse.data.length > 0) {
    const sampleBan = comboResponse.data[0];
    TestValidator.predicate(
      "ban record has banned user information",
      sampleBan.bannedUser !== undefined,
    );
    TestValidator.predicate(
      "ban record has banning administrator information",
      sampleBan.banningAdministrator !== undefined,
    );
    TestValidator.predicate(
      "banned user has display name",
      sampleBan.bannedUser.display_name !== undefined,
    );
    TestValidator.predicate(
      "banning administrator has display name",
      sampleBan.banningAdministrator.display_name !== undefined,
    );
  }
  // Test pagination functionality
  const paginationResponse =
    await api.functional.discussionBoard.admin.user_bans.index(
      adminConnection,
      {
        body: {
          appealStatus: "none",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(paginationResponse);
  TestValidator.predicate(
    "pagination metadata is present",
    paginationResponse.pagination.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    paginationResponse.data.length <= 5,
  );
}
