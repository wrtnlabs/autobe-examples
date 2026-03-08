import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
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
  const email = typia.random<string & tags.MinLength<1> & tags.Format<"email">>();
  const output: IRedditLikeAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email,
        password: "StrongPass123!",
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeAdmin.IJoin,
    },
  );
  typia.assert(output);
  TestValidator.equals("email matches", output.email, email);
  TestValidator.equals(
    "has access token",
    typeof output.token.access,
    "string",
  );
  TestValidator.equals(
    "has refresh token",
    typeof output.token.refresh,
    "string",
  );
  // Verify admin can login after registration
  const loginOutput: IRedditLikeAdmin.IAuthorized = await authorize_admin_login(
    adminConnection,
    {
      body: {
        email,
        password: "StrongPass123!",
      } satisfies IRedditLikeAdmin.ILogin,
    },
  );
  typia.assert(loginOutput);
  TestValidator.equals("login returns same email", loginOutput.email, email);
}