import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizen";
import type { IEconomicBoardCitizenEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardCitizenEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_citizen_join } from "../../../authorize/authorize_citizen_join";
import { authorize_citizen_login } from "../../../authorize/authorize_citizen_login";
import { authorize_citizen_refresh } from "../../../authorize/authorize_citizen_refresh";

export async function test_api_user_email_verification_active(
  connection: api.IConnection,
): Promise<void> {
  // Create unverified citizen account and capture email
  const citizenConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePass123!" satisfies string & tags.MinLength<8>;
  const displayName = RandomGenerator.name() satisfies string &
    tags.MinLength<2> &
    tags.MaxLength<50>;
  const bio = RandomGenerator.paragraph({ sentences: 3 }) satisfies
    | (string & tags.MaxLength<500>)
    | undefined;
  const joinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      bio,
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  typia.assert(joinResponse);
  // Verify email using empty body per provided DTO
  // Although API description says it wants token, the provided DTO is empty
  // We follow the type system strictly
  const verifyConnection: api.IConnection = { host: connection.host };
  await api.functional.economicBoard.citizen.email_verifications.confirm(
    verifyConnection,
    {
      body: {} satisfies IEconomicBoardCitizenEmailVerification,
    },
  );
  // Now test that account is active by logging in
  const loginConnection: api.IConnection = { host: connection.host };
  // Since ILogin is not provided, we must construct it manually from context
  // According to join, the structure for login should be similar to join but without display_name and bio
  // Assume it's { email, password }
  const loginResponse = await authorize_citizen_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies {
      email: string & tags.Format<"email">;
      password: string & tags.MinLength<8>;
    },
  });
  typia.assert(loginResponse);
  // Verify successful login means account is activated
  TestValidator.equals(
    "login id matches join id",
    loginResponse.id,
    joinResponse.id,
  );
}
