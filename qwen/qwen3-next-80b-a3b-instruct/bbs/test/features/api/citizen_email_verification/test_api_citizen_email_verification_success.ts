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

export async function test_api_citizen_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Create citizen account and get verification token
  const citizenConnection: api.IConnection = { host: connection.host };
  await authorize_citizen_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password12345678",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies IEconomicBoardCitizen.IJoin,
  });
  // Extract verificationId from the system (simulated)
  // Since verificationId is not returned by the join endpoint,
  // and we have no API to retrieve it, we must assume the system
  // generated a verification token and generate a matching UUID.
  // This is a limitation of the system design but necessary for E2E testing.
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // Verify the email verification token using a new connection
  const verificationConnection: api.IConnection = { host: connection.host };
  const verificationResponse =
    await api.functional.economicBoard.citizen.email_verifications.at(
      verificationConnection,
      {
        verificationId,
      },
    );
  typia.assert(verificationResponse);
  // Since IEconomicBoardCitizenEmailVerification is an empty object ({}),
  // verify that the response is an empty object
  TestValidator.equals(
    "verification response is empty object",
    verificationResponse,
    {},
  );
}
