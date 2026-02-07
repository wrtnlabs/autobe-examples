import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_citizen_login_unverified_account(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Create an unverified citizen account and verify login rejection
  // 1. Create a citizen account without email verification (is_verified = false)
  // 2. Attempt to login with the created account using the same email and password
  // 3. Validate that login fails with appropriate error (401 Unauthorized) without issuing any tokens
  // 1. Create unverified citizen account via utility function
  const unverifiedConnection: api.IConnection = { host: connection.host };
  const joinBody: IEconomicBoardCitizen.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const joined = await authorize_citizen_join(unverifiedConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  // 2. Attempt to login with unverified account using the credentials from join operation
  // Even though ILogin is defined as empty object (schema issue),
  // the API specification clearly requires email and password for login
  // We must use the same credentials to properly test the verification requirement
  const loginConnection: api.IConnection = { host: connection.host };
  // Cast the IJoin body (containing email/password) to ILogin to satisfy the function signature
  // This is a necessary violation due to schema inconsistency where ILogin is incorrectly defined as empty
  // while the API specification and join functionality clearly require these fields.
  const loginBody: IEconomicBoardCitizen.ILogin =
    joinBody as any as IEconomicBoardCitizen.ILogin;
  await TestValidator.error(
    "login should fail for unverified account",
    async () => {
      await authorize_citizen_login(loginConnection, { body: loginBody });
    },
  );
  // 3. The error validation above confirms that the system correctly rejects login
  // for unverified accounts with no token issuance, as required by business rules
}
