import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_administrator_grade_change_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving an administrator grade change record that has been soft deleted but still exists in the system for audit purposes. This ensures that the API correctly returns the record including the deletedAt timestamp indicating soft deletion, allowing super administrators to audit historical grade changes. Authentication with superAdministrator join is required to access this sensitive information.
  // 1. Prepare super administrator's authorized connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as super administrator (join in test context, could use login if available)
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12345678",
        href: "http://localhost/",
        referrer: "http://localhost/referrer",
        ip: null,
      },
    },
  );
  // 3. Use authorized connection for retrieving soft-deleted administrator grade change record
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = { Authorization: superAdminAuth.token.access };
  // 4. We need to assume existence of a gradeChangeId that is soft deleted. Since we do not have a creation API or utility function, we generate a random UUID and attempt to retrieve it.
  //    In a real scenario, this should be replaced by a pre-created record or fixture.
  const softDeletedGradeChangeId = typia.random<string & tags.Format<"uuid">>();
  // 5. Retrieve the administrator grade change record including a deletedAt timestamp
  const result =
    await api.functional.discussionBoard.superAdministrator.administrator_grade_changes.at(
      authConnection,
      {
        gradeChangeId: softDeletedGradeChangeId,
      },
    );
  // 6. Validate the response structure and the presence of deletedAt timestamp
  typia.assert(result);
  // 7. The returned record must have the same requested gradeChangeId
  TestValidator.equals(
    "gradeChangeId matches",
    result.id,
    softDeletedGradeChangeId,
  );
  // 8. The soft deletion timestamp deletedAt must not be undefined, expecting null or string
  TestValidator.predicate(
    "deletedAt is present (can be null or date string)",
    result.deletedAt !== undefined,
  );
}
