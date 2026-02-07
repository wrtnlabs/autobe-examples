import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_bans_search_complex_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create multiple bans with different characteristics
  const bans = await ArrayUtil.asyncRepeat(5, async () => {
    return await generate_random_discussion_board_admin_bans_create(
      adminConnection,
      {
        body: {
          banned_user_id: typia.random<string & tags.Format<"uuid">>(),
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
          ban_duration_type: RandomGenerator.pick([
            "temporary",
            "permanent",
          ] as const),
          ban_duration_days:
            RandomGenerator.pick(["temporary", "permanent"] as const) ===
            "temporary"
              ? typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>()
              : undefined,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  });
  bans.forEach((ban) => typia.assert(ban));
  // Test filtering by ban_duration_type
  const temporaryBans = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        ban_duration_type: "temporary",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(temporaryBans);
  TestValidator.predicate(
    "temporary bans filter should return results",
    temporaryBans.data.length > 0,
  );
  const permanentBans = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        ban_duration_type: "permanent",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(permanentBans);
  TestValidator.predicate(
    "permanent bans filter should return results",
    permanentBans.data.length > 0,
  );
  // Test filtering by appeal_status
  const noAppealBans = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        appeal_status: "none",
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(noAppealBans);
  TestValidator.predicate(
    "no appeal bans filter should return results",
    noAppealBans.data.length > 0,
  );
  // Test date range filtering
  const recentBans = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        ban_started_at_from: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(recentBans);
  TestValidator.predicate(
    "date range filter should return results",
    recentBans.data.length > 0,
  );
  // Test text search on ban_reason
  const searchTerm = RandomGenerator.substring(bans[0].ban_reason);
  const searchBans = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        search: searchTerm,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(searchBans);
  TestValidator.predicate(
    "text search should return results",
    searchBans.data.length > 0,
  );
  // Test combined filtering
  const combinedFilterBans =
    await api.functional.discussionBoard.admin.bans.index(adminConnection, {
      body: {
        ban_duration_type: "temporary",
        appeal_status: "none",
      } satisfies IDiscussionBoardUserBan.IRequest,
    });
  typia.assert(combinedFilterBans);
  TestValidator.predicate(
    "combined filter should return results",
    combinedFilterBans.data.length > 0,
  );
  // Test pagination
  const paginatedBans = await api.functional.discussionBoard.admin.bans.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardUserBan.IRequest,
    },
  );
  typia.assert(paginatedBans);
  TestValidator.equals(
    "pagination should return limited results",
    paginatedBans.data.length,
    2,
  );
  TestValidator.equals(
    "pagination limit should match",
    paginatedBans.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "pagination should have total records",
    paginatedBans.pagination.records > 0,
  );
}
