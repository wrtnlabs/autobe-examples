import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_credentials_rejected(
  connection: api.IConnection,
): Promise<void> {
  const registeredConnection: api.IConnection = { host: connection.host };
  const unknownConnection: api.IConnection = { host: connection.host };
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  const registeredEmail = `${RandomGenerator.alphabets(10)}@test.com`;
  const registeredPassword = "Validpass123!";
  const joined = await authorize_member_join(registeredConnection, {
    body: {
      email: registeredEmail,
      password: registeredPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joined);
  await TestValidator.error(
    "unknown email login should be rejected",
    async () => {
      await authorize_member_login(unknownConnection, {
        body: {
          email: `${RandomGenerator.alphabets(10)}@test.com`,
          password: registeredPassword,
        } satisfies IErpHrmTimeMember.ILogin,
      });
    },
  );
  await TestValidator.error(
    "wrong password login should be rejected",
    async () => {
      await authorize_member_login(wrongPasswordConnection, {
        body: {
          email: registeredEmail,
          password: "Validpass123?",
        } satisfies IErpHrmTimeMember.ILogin,
      });
    },
  );
}
