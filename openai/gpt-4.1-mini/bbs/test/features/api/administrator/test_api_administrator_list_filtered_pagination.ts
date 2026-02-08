import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_list_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers = { Authorization: authorized.token.access };
  // 2. Prepare request body for administrators list (empty due to DTO schema)
  const requestBody = {} satisfies IDiscussionBoardAdministrator.IRequest;
  // 3. Call administrators index API
  const response =
    await api.functional.discussionBoard.administrator.administrators.index(
      adminConnection,
      { body: requestBody },
    );
  typia.assert(response);
  // 4. Validate pagination structure and data
  TestValidator.predicate(
    "pagination current is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is positive or zero",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is positive or zero",
    response.pagination.records >= 0,
  );
  // 5. Validate each administrator summary in data array
  for (const adminSummaryRaw of response.data) {
    const adminSummary = typia.assert<IEntity & {
      email: string;
      grade: string;
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    }>(adminSummaryRaw);
    TestValidator.predicate(
      "id is UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        adminSummary.id,
      ),
    );
    TestValidator.predicate(
      "email is non-empty string",
      typeof adminSummary.email === "string" && adminSummary.email.length > 0,
    );
    TestValidator.predicate(
      "grade is string",
      typeof adminSummary.grade === "string",
    );
    typia.assert(adminSummary.created_at);
    typia.assert(adminSummary.updated_at);
    if (adminSummary.deleted_at !== null) typia.assert(adminSummary.deleted_at);
  }
}
