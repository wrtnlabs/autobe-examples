import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_administrator_grades_list_default_pagination_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, { body: {} });
  // Prepare request with no filters
  const body = {};
  // Call the administratorGrades.index endpoint
  const output =
    await api.functional.discussionBoard.administrator.administratorGrades.index(
      adminConnection,
      { body },
    );
  typia.assert(output);
  // Validate pagination metadata fields
  TestValidator.predicate(
    "pagination current page positive",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    output.pagination.records >= 0,
  );
  // Validate that data is an array
  TestValidator.predicate("data is an array", Array.isArray(output.data));
  // Check ordering by level cannot be done due to missing properties
  // Skipping ordering validation to maintain compilation correctness
}
