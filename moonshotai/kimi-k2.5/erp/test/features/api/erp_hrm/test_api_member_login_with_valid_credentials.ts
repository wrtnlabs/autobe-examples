import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const firstName = RandomGenerator.name(1);
  const lastName = RandomGenerator.name(1);
  // 1. Register a new member first to get valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(joinConnection, {
    body: {
      email,
      password,
      firstName,
      lastName,
      avatarUrl: null,
      timezone: null,
      locale: null,
    },
  });
  typia.assert(joined);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_member_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IErpHrmMember.ILogin,
  });
  typia.assert(loggedIn);
  // 3. Verify response fields match registration data (business logic validation)
  TestValidator.equals("email matches registration", loggedIn.email, email);
  TestValidator.equals(
    "firstName matches registration",
    loggedIn.firstName,
    firstName,
  );
  TestValidator.equals(
    "lastName matches registration",
    loggedIn.lastName,
    lastName,
  );
  // 4. Verify account is not deleted (business logic validation)
  TestValidator.equals("account not deleted", loggedIn.deletedAt, null);
}
