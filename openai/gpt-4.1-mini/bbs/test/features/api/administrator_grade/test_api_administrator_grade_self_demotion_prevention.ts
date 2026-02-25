import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
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

export async function test_api_administrator_grade_self_demotion_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Step 1. Register and authenticate as a new super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "StrongPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // Update the connection with the new token from superAdmin
  superAdminConnection.headers = {
    Authorization: `Bearer ${superAdmin.token.access}`,
  };
  // Step 2. Attempt to demote own grade to regular administrator
  // We try to update the grade with demotion details
  // As we have no direct knowledge of the grade ID to set, we simulate demotion by setting typical demotion values
  // We'll assert that the operation fails
  // Prepare an update that represents demotion (e.g., level = 1 or name = "regular")
  // Since business logic expects denial, we expect an error on this update
  // The request body type allows partial fields, so we can try to modify the level or name
  // Attempt demotion update body:
  const demotionUpdateBody: IDiscussionBoardAdministratorGrade.IUpdate = {
    name: "regular",
    level: 1,
  };
  // We expect this to throw error because self-demotion is forbidden
  await TestValidator.error("self-demotion prevented", async () => {
    await api.functional.discussionBoard.superAdministrator.administrator.grades.updateAdministratorGrades(
      superAdminConnection,
      { body: demotionUpdateBody },
    );
  });
  // Step 3. Confirm that own grade remains unchanged by fetching the grade details
  // However, API to fetch own grade by ID is not available in given functions
  // So we rely on that updateAdministratorGrades returns updated grade if success
  // Since self-demotion failed, no successful update occurred
  // Instead, we can try to invoke updateAdministratorGrades with current grade info to verify no change occurs
  // Let's perform an update that doesn't change anything (i.e., empty update body), it should succeed
  // First, try to update with empty body
  const passThroughUpdateBody: IDiscussionBoardAdministratorGrade.IUpdate = {};
  const result =
    await api.functional.discussionBoard.superAdministrator.administrator.grades.updateAdministratorGrades(
      superAdminConnection,
      { body: passThroughUpdateBody },
    );
  typia.assert(result);
  // Ensure the result is still a super administrator (level > 1 or name != "regular")
  TestValidator.predicate(
    "grade not demoted",
    result.name !== "regular" ||
      (result.level !== 1 && result.level !== undefined),
  );
}
