import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_login_invalid_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. First register a valid super administrator account to ensure the system has at least one account
  const joinConnection: api.IConnection = { host: connection.host };
  const validAdmin = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(validAdmin);
  // 2-3. Test login rejection with first non-existent email
  const invalidLoginConnection: api.IConnection = { host: connection.host };
  const invalidEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login with non-existent email should fail with authentication error",
    async () => {
      await authorize_super_administrator_login(invalidLoginConnection, {
        body: {
          email: invalidEmail,
          password: "AnyPassword123!",
        },
      });
    },
  );
  // 4-5. Verify no tokens or super administrator data is returned (failure is detected)
  // The error above confirms the login was rejected without any response data
  // Generic error message prevents account enumeration
  // 6. Test with another non-existent email to verify consistent behavior
  const anotherInvalidConnection: api.IConnection = { host: connection.host };
  const anotherInvalidEmail = typia.random<string & tags.Format<"email">>();
  await TestValidator.error(
    "login with another non-existent email should also fail consistently",
    async () => {
      await authorize_super_administrator_login(anotherInvalidConnection, {
        body: {
          email: anotherInvalidEmail,
          password: "DifferentPassword456!",
        },
      });
    },
  );
}
