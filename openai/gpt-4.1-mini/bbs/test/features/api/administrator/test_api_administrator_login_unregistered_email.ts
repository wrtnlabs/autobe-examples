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

export async function test_api_administrator_login_unregistered_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a fresh administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare login credentials using an email that is almost certainly unregistered
  const unregisteredEmail = `not_exists_${Date.now()}@example.com`;
  const loginBody: IDiscussionBoardAdministrator.ILogin = {
    email: unregisteredEmail,
    password: "WrongPassword123!",
    href: "https://localhost/login",
    referrer: "https://localhost",
    ip: null,
  };
  // Attempt to login as administrator with the unregistered email
  await TestValidator.error(
    "administrator login with unregistered email should fail",
    async () => {
      await authorize_administrator_login(adminConnection, { body: loginBody });
    },
  );
}
