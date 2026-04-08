import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_promotion_forbidden_for_regular_administrator(
  connection: api.IConnection,
): Promise<void> {
  const regularAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const regularAdministrator = await authorize_administrator_join(
    regularAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(regularAdministrator);
  const targetAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const targetAdministrator = await authorize_administrator_join(
    targetAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(targetAdministrator);
  await TestValidator.httpError(
    "regular administrator cannot promote another administrator",
    403,
    async () => {
      await api.functional.mallPlatform.administrator.administrators.promote(
        regularAdministratorConnection,
        {
          administratorId: targetAdministrator.id,
        },
      );
    },
  );
}
