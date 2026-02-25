import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import type { IDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserUnban";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserUnban } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserUnban";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_user_unban_list_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator Join (Authenticate)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // Prepare request body to request the unban list - with a page and limit for pagination
  // Here we expect no unbans, so any filter is default or arbitrary
  const requestBody: IDiscussionBoardUserUnban.IRequest = {
    page: 1,
    limit: 10,
  };
  // 2. Get user unban list with empty results expected
  const unbans =
    await api.functional.discussionBoard.superAdministrator.administrator.unbans.index(
      superAdminConnection,
      { body: requestBody },
    );
  typia.assert(unbans);
  // Validate that the data array is empty
  TestValidator.equals("unban list data array length", unbans.data.length, 0);
  // Validate that pagination indicates zero records and zero pages
  TestValidator.equals("pagination records", unbans.pagination.records, 0);
  TestValidator.equals("pagination pages", unbans.pagination.pages, 0);
  // Validate that the current page is the requested page (1) and limit is correct
  TestValidator.equals(
    "pagination current page",
    unbans.pagination.current,
    requestBody.page!,
  );
  TestValidator.equals(
    "pagination limit",
    unbans.pagination.limit,
    requestBody.limit!,
  );
}
