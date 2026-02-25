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

export async function test_api_super_administrator_user_unban_list_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create superAdministrator connection and authorize
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: null,
      },
    },
  );
  superAdminConnection.headers = {
    Authorization: superAdmin.token.access,
  };
  // 1. Test default pagination (page=1, limit unspecified)
  const defaultPageInput: IDiscussionBoardUserUnban.IRequest = {};
  const defaultPageResult =
    await api.functional.discussionBoard.superAdministrator.administrator.unbans.index(
      superAdminConnection,
      { body: defaultPageInput },
    );
  typia.assert(defaultPageResult);
  // Validate pagination defaults
  TestValidator.predicate(
    "pagination current page is at least 1",
    defaultPageResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    defaultPageResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    defaultPageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultPageResult.pagination.pages >= 0,
  );
  // Validate data array structure
  for (const unban of defaultPageResult.data) {
    typia.assert(unban);
    typia.assert(unban.userBan);
    typia.assert(unban.administrator);
    TestValidator.predicate(
      "unban id is uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        unban.id,
      ),
    );
    TestValidator.predicate("reason is non-empty", unban.reason.length > 0);
    TestValidator.predicate(
      "timestamps are iso date strings",
      !!(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(unban.createdAt) &&
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(unban.updatedAt)
      ),
    );
    // deletedAt can be null or iso string
    TestValidator.predicate(
      "deletedAt is null or iso string",
      unban.deletedAt === null ||
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(unban.deletedAt ?? ""),
    );
  }
  // 2. Filter by administratorId
  if (defaultPageResult.data.length > 0) {
    const administratorId = defaultPageResult.data[0].administrator.id;
    const filterByAdminInput: IDiscussionBoardUserUnban.IRequest = {
      administratorId,
    };
    const filteredByAdmin =
      await api.functional.discussionBoard.superAdministrator.administrator.unbans.index(
        superAdminConnection,
        { body: filterByAdminInput },
      );
    typia.assert(filteredByAdmin);
    for (const unban of filteredByAdmin.data) {
      TestValidator.equals(
        "filtered administratorId matches",
        unban.administrator.id,
        administratorId,
      );
    }
  }
  // 3. Filter by createdAfter and createdBefore date range
  if (defaultPageResult.data.length > 1) {
    const createdAfter = defaultPageResult.data[0].createdAt;
    const createdBefore =
      defaultPageResult.data[defaultPageResult.data.length - 1].createdAt;
    const filterByDateInput: IDiscussionBoardUserUnban.IRequest = {
      createdAfter,
      createdBefore,
    };
    const filteredByDate =
      await api.functional.discussionBoard.superAdministrator.administrator.unbans.index(
        superAdminConnection,
        { body: filterByDateInput },
      );
    typia.assert(filteredByDate);
    for (const unban of filteredByDate.data) {
      TestValidator.predicate(
        "createdAt within filter range",
        unban.createdAt >= createdAfter && unban.createdAt < createdBefore,
      );
    }
  }
  // 4. Test pagination limit and page
  const paginatedInput: IDiscussionBoardUserUnban.IRequest = {
    page: 1,
    limit: 2,
  };
  const paginatedResult =
    await api.functional.discussionBoard.superAdministrator.administrator.unbans.index(
      superAdminConnection,
      { body: paginatedInput },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "limit respected",
    paginatedResult.data.length <= paginatedInput.limit!,
  );
  // 5. Test sorting order (by createdAt ascending)
  if (paginatedResult.data.length > 1) {
    for (let i = 1; i < paginatedResult.data.length; i++) {
      TestValidator.predicate(
        "createdAt ascending order",
        paginatedResult.data[i - 1].createdAt <=
          paginatedResult.data[i].createdAt,
      );
    }
  }
}
