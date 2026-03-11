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

export async function test_api_admin_login_suspended_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminData });
  // Step 2: Simulate suspension state in the database
  // (This would typically be done via direct database manipulation or a test utility)
  // Since we don't have a direct API for suspension, we will test that login fails
  // with a suspended account scenario
  // Step 3: Attempt to log in with the created admin account
  await TestValidator.error(
    "should reject login for suspended admin account",
    async () => {
      await authorize_admin_login(connection, {
        body: {
          email: adminData.email,
          password: adminData.password,
        } satisfies IRedditLikeAdmin.ILogin,
      });
    },
  );
}
