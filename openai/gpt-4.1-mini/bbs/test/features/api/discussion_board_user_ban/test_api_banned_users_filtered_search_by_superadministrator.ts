import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_banned_users_filtered_search_by_superadministrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdminAuth.token.access}`,
  };
  // 2. Prepare filter parameters for banned users search
  const filterBody: IDiscussionBoardUserBan.IRequest = {
    registeredUserId: typia.random<string & tags.Format<"uuid">>(),
    administratorId: typia.random<string & tags.Format<"uuid">>(),
    reason: "test",
    banStart: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(), // 10 days ago
    banEnd: new Date().toISOString(), // now
    page: 1,
    limit: 10,
  };
  // 3. Retrieve banned users filtered by above parameters
  const response =
    await api.functional.discussionBoard.superAdministrator.administrator.bans.index(
      superAdminConnection,
      { body: filterBody },
    );
  // 4. Assert response type and structure
  typia.assert(response);
  // 5. Validate pagination properties
  TestValidator.predicate(
    "pagination current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0 and <= 100",
    response.pagination.limit > 0 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  // 6. Validate each ban record matches the filter criteria
  for (const ban of response.data) {
    TestValidator.predicate(
      "ban reason includes filter reason",
      ban.reason.includes(filterBody.reason ?? ""),
    );
    const banDate = new Date(ban.bannedAt).getTime();
    const banStartTime = filterBody.banStart
      ? new Date(filterBody.banStart).getTime()
      : 0;
    const banEndTime = filterBody.banEnd
      ? new Date(filterBody.banEnd).getTime()
      : Date.now();
    TestValidator.predicate(
      "ban bannedAt within range",
      banDate >= banStartTime && banDate <= banEndTime,
    );
    if (filterBody.registeredUserId) {
      TestValidator.equals(
        "ban registered user ID matches filter",
        ban.registeredUser.id,
        filterBody.registeredUserId,
      );
    }
    if (filterBody.administratorId) {
      if (ban.administrator) {
        TestValidator.equals(
          "ban administrator ID matches filter",
          ban.administrator.id,
          filterBody.administratorId,
        );
      }
    }
  }
}
