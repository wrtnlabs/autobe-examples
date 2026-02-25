import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_administrator_grade_changes_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 0. Attempt without authorization
  await TestValidator.httpError(
    "unauthorized access rejected",
    401,
    async () => {
      // Use base connection without auth headers
      await api.functional.discussionBoard.superAdministrator.administrator_grade_changes.index(
        { host: connection.host },
        { body: {} },
      );
    },
  );
  // 1. Join as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const joinUser: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {});
  // Apply token header for authenticated connection
  superAdminConnection.headers = superAdminConnection.headers ?? {};
  superAdminConnection.headers.Authorization = `Bearer ${joinUser.token.access}`;
  // 2. Access endpoint with authorization
  const body: IDiscussionBoardAdministratorGradeChange.IRequest = {
    page: 1,
    limit: 10,
  };
  const response: IPageIDiscussionBoardAdministratorGradeChange.ISummary =
    await api.functional.discussionBoard.superAdministrator.administrator_grade_changes.index(
      superAdminConnection,
      { body },
    );
  typia.assert(response);
  // 3. Validate pagination properties
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    response.pagination.pages >= 0,
  );
  // 4. If data exists, validate each record
  if (response.data.length > 0) {
    for (const record of response.data) {
      typia.assert(record);
      // Validate id and timestamps
      TestValidator.predicate(
        "record id has length 36",
        record.id.length === 36,
      );
      TestValidator.predicate(
        "created_at is ISO date",
        !Number.isNaN(Date.parse(record.created_at)),
      );
      TestValidator.predicate(
        "updated_at is ISO date",
        !Number.isNaN(Date.parse(record.updated_at)),
      );
      // deleted_at can be null or ISO string
      if (record.deleted_at !== null) {
        TestValidator.predicate(
          "deleted_at is ISO date or null",
          !Number.isNaN(Date.parse(record.deleted_at)),
        );
      }
      // Validate administrator summary
      typia.assert(record.administrator);
      TestValidator.predicate(
        "administrator id length 36",
        record.administrator.id.length === 36,
      );
      TestValidator.predicate(
        "administrator email non-empty",
        record.administrator.email.length > 0,
      );
      typia.assert(record.administrator.grade);
      // Validate grade summary
      typia.assert(record.grade);
    }
  }
}
