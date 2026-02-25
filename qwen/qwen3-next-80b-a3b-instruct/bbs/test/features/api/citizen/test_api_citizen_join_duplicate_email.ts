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

export async function test_api_citizen_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Create initial citizen account
  const firstConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_citizen_join(firstConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(firstUser);
  // Attempt duplicate registration with same email
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email registration should return 409 Conflict",
    409,
    async () => {
      await authorize_citizen_join(secondConnection, {
        body: {
          email: firstUser.email, // Reuse same email
          password: RandomGenerator.alphaNumeric(16),
        },
      });
    },
  );
}
