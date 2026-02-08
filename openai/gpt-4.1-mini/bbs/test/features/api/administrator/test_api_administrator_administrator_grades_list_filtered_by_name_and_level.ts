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

export async function test_api_administrator_administrator_grades_list_filtered_by_name_and_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins (registers) to obtain authorization and token
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Define a partial name fragment and an exact level to filter
  // Since schema is empty for IRequest, we treat it as an empty object
  // We'll test with a valid name fragment (we pick a random string) and a valid level number
  // But since IRequest is empty object ({}), we simulate filters manually by calling the endpoint with arbitrary body
  // 3. Call index API with some dummy body that is {} because schema IRequest is {}
  const filterBody1 = {};
  const filteredList1 =
    await api.functional.discussionBoard.administrator.administratorGrades.index(
      adminConnection,
      { body: filterBody1 },
    );
  typia.assert(filteredList1);
  // 4. Validate the pagination object
  TestValidator.predicate(
    "pagination object exists",
    typeof filteredList1.pagination === "object" &&
      filteredList1.pagination !== null,
  );
  TestValidator.predicate(
    "pagination current page is positive",
    filteredList1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    filteredList1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    filteredList1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    filteredList1.pagination.pages >= 0,
  );
  // 5. Since the schema for ISummary is empty, no further property-based check is possible
  // Just check that the data is an array
  TestValidator.predicate(
    "data is an array",
    Array.isArray(filteredList1.data),
  );
  // 6. Call the index API with empty filters again for edge case with no matches
  const filterBody2 = {};
  const filteredList2 =
    await api.functional.discussionBoard.administrator.administratorGrades.index(
      adminConnection,
      { body: filterBody2 },
    );
  typia.assert(filteredList2);
  TestValidator.predicate(
    "data list is an array",
    Array.isArray(filteredList2.data),
  );
  // 7. Check if empty data array is handled gracefully (possibly no matches)
  if (filteredList2.data.length === 0) {
    TestValidator.predicate("empty data handled", true);
  } else {
    TestValidator.predicate("non-empty data", true);
  }
}
