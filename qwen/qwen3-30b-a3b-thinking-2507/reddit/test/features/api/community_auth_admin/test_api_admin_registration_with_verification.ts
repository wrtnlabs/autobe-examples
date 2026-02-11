import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_with_verification(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const output: ICommunityAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(),
      } satisfies ICommunityAdmin.IJoin,
    },
  );
  typia.assert(output);
  TestValidator.equals("email matches input", output.email, output.email);
  TestValidator.equals(
    "username matches input",
    output.username,
    output.username,
  );
}
