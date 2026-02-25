import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_bans_create";
import { generate_random_discussion_board_administrator_administrator_unbans_create_unban } from "../../../generate/generate_random_discussion_board_administrator_administrator_unbans_create_unban";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";
import { prepare_random_discussion_board_user_unban } from "../../../prepare/prepare_random_discussion_board_user_unban";

export async function test_api_administrator_bans_list_filter_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of paginated banned users list by an administrator
  // Scenario 2: Filtering banned users list by registeredUserId and reason keyword
  // Scenario 3: Filtering banned users list by ban date range and administratorId
  // 1. Administrator authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(6)}@test.com`,
      password: "Password123!",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Helper arrays to track created bans and unbans
  const createdBans: IDiscussionBoardUserBan[] = [];
  const createdUnbans: IDiscussionBoardUserUnban[] = [];
  // Create multiple bans
  const banCount = 5;
  for (let i = 0; i < banCount; i++) {
    // Create ban for different user with reason
    const ban =
      await generate_random_discussion_board_administrator_administrator_bans_create(
        adminConnection,
        {
          body: {
            reason: `Reason number ${i + 1} - ${RandomGenerator.name(2)}`,
          },
        },
      );
    typia.assert(ban);
    createdBans.push(ban);
  }
  // Optionally unban some users (for scenario 1 completeness)
  if (banCount >= 3) {
    for (let i = 0; i < 2; i++) {
      const unban =
        await generate_random_discussion_board_administrator_administrator_unbans_create_unban(
          adminConnection,
          {
            body: {
              userBanId: createdBans[i].id,
              administratorId: adminAuth.id,
              reason: `Unban reason ${i + 1}`,
            },
          },
        );
      typia.assert(unban);
      createdUnbans.push(unban);
    }
  }
  // Scenario 1: Fetch paginated bans list without filters
  {
    const pageRequest: IDiscussionBoardUserBan.IRequest = {
      page: 1,
      limit: 10,
    };
    const response =
      await api.functional.discussionBoard.administrator.administrator.bans.index(
        adminConnection,
        {
          body: pageRequest,
        },
      );
    typia.assert(response);
    // Validate pagination
    TestValidator.predicate(
      "pagination has current page",
      response.pagination.current === 1,
    );
    TestValidator.predicate(
      "pagination records non-negative",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages non-negative",
      response.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination limit accurate",
      response.pagination.limit === 10,
    );
    // Validate data array consistency
    TestValidator.predicate("data is array", Array.isArray(response.data));
    // Validate that all banned users in response correspond to created bans
    for (const banSummary of response.data) {
      // Check banSummary corresponds to createdBans
      const found = createdBans.find((b) => b.id === banSummary.id);
      TestValidator.predicate(
        "ban included in created bans",
        found !== undefined,
      );
      if (found) {
        TestValidator.equals("reason matches", banSummary.reason, found.reason);
        TestValidator.equals(
          "registeredUserId matches",
          banSummary.registeredUser?.id,
          found.registeredUserId,
        );
        TestValidator.equals(
          "administratorId matches",
          banSummary.administrator?.id ?? null,
          found.administratorId ?? null,
        );
        TestValidator.predicate(
          "bannedAt timestamp exists",
          typeof banSummary.bannedAt === "string",
        );
        TestValidator.predicate(
          "createdAt exists",
          typeof banSummary.createdAt === "string",
        );
      }
    }
  }
  // Scenario 2: Filter bans by registeredUserId and reason keyword
  {
    if (createdBans.length >= 2) {
      const filterUserId = createdBans[1].registeredUserId;
      const filterReasonKeyword = createdBans[1].reason.split(" ")[0];
      const filterRequest: IDiscussionBoardUserBan.IRequest = {
        registeredUserId: filterUserId,
        reason: filterReasonKeyword,
        page: 1,
        limit: 10,
      };
      const filterResponse =
        await api.functional.discussionBoard.administrator.administrator.bans.index(
          adminConnection,
          {
            body: filterRequest,
          },
        );
      typia.assert(filterResponse);
      TestValidator.predicate(
        "filtered pagination current page",
        filterResponse.pagination.current === 1,
      );
      TestValidator.predicate(
        "filtered pagination limit",
        filterResponse.pagination.limit === 10,
      );
      // All returned data must match filter criteria
      for (const banSummary of filterResponse.data) {
        TestValidator.equals(
          "filter by registeredUserId",
          banSummary.registeredUser?.id,
          filterUserId,
        );
        TestValidator.predicate(
          "filter reason keyword",
          banSummary.reason.includes(filterReasonKeyword),
        );
      }
    }
  }
  // Scenario 3: Filter bans by ban date range and administratorId
  {
    // Prepare date range around created bans
    const dates = createdBans.map((ban) => new Date(ban.bannedAt));
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    // Filter date range - use minDate to maxDate
    const adminIdFilter = adminAuth.id;
    const dateRangeRequest: IDiscussionBoardUserBan.IRequest = {
      administratorId: adminIdFilter,
      banStart: minDate.toISOString(),
      banEnd: maxDate.toISOString(),
      page: 1,
      limit: 10,
    };
    const dateRangeResponse =
      await api.functional.discussionBoard.administrator.administrator.bans.index(
        adminConnection,
        {
          body: dateRangeRequest,
        },
      );
    typia.assert(dateRangeResponse);
    // Validate pagination info
    TestValidator.predicate(
      "date range pagination current page",
      dateRangeResponse.pagination.current === 1,
    );
    TestValidator.predicate(
      "date range pagination limit",
      dateRangeResponse.pagination.limit === 10,
    );
    // All results within date range and match administratorId
    for (const ban of dateRangeResponse.data) {
      TestValidator.equals(
        "administratorId filter",
        ban.administrator?.id ?? null,
        adminIdFilter,
      );
      const bannedAtDate = new Date(ban.bannedAt);
      TestValidator.predicate(
        "bannedAt within range",
        bannedAtDate >= minDate && bannedAtDate <= maxDate,
      );
    }
  }
}
