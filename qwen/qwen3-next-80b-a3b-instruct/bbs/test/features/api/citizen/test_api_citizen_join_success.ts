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

export async function test_api_citizen_join_success(
  connection: api.IConnection,
): Promise<void> {
  // A guest user successfully registers a new citizen account by providing a valid, unique email address, a password of at least 8 characters, and a display name. The system validates the email format against RFC 5322, checks that the email is not already registered, hashes the password using bcrypt with cost factor 12, creates a new citizen record with is_verified=false, and generates an email verification token valid for 24 hours. The response contains an IEconomicBoardCitizen.IAuthorized object with a refresh token and is_verified=false, confirming account creation but requiring email verification before login.
  // Create a new citizen account with valid credentials
  const citizenConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const displayName = RandomGenerator.name();
  const joinResponse = await authorize_citizen_join(citizenConnection, {
    body: {
      email,
      password,
      display_name: displayName,
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Only validate response structure with typia.assert()
  // All other validations are redundant per E2E test rules
  typia.assert(joinResponse);
}
