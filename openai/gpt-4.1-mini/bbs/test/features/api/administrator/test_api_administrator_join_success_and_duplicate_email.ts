import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_success_and_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful Administrator Registration
  // - Submit administrator join request with a unique and valid email and a strong password.
  // - Verify response includes authorization tokens and administrator details.
  // - Confirm the new administrator record is created in the system with correct grade assignment and timestamps.
  // - Ensure the password is securely hashed and not returned in the response.
  // Scenario 2: Administrator Registration with Duplicate Email
  // - Attempt to register a new administrator using an email that already exists in the system.
  // - Verify the system rejects the request with an appropriate error indicating email uniqueness violation.
  // - Confirm no new administrator record is created for the duplicate email.
  // Create base connection for administrator join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  // Generate unique email and password for first admin join
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const strongPassword = "StrongPass!23456";
  // 1. Successful join
  const admin1 = await authorize_administrator_join(adminJoinConnection, {
    body: { email: uniqueEmail, password: strongPassword },
  });
  typia.assert(admin1);
  TestValidator.equals("email matches input", admin1.email, uniqueEmail);
  TestValidator.predicate(
    "authorization token access present",
    typeof admin1.token.access === "string" && admin1.token.access.length > 0,
  );
  // 2. Attempt duplicate join with the same email
  await TestValidator.error(
    "duplicate email registration rejected",
    async () => {
      await authorize_administrator_join(adminJoinConnection, {
        body: { email: uniqueEmail, password: strongPassword },
      });
    },
  );
}
