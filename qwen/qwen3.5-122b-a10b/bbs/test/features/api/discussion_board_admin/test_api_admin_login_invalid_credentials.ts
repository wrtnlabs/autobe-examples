import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_invalid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for testing
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // 2. Test login with wrong password
  const wrongPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await authorize_admin_login(wrongPasswordConnection, {
        body: {
          email: adminAccount.email,
          password: RandomGenerator.alphaNumeric(16), // Different password
        } satisfies IDiscussionBoardAdmin.ILogin,
      });
    },
  );
  // 3. Test login with non-existent email
  const nonExistentEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "login with non-existent email should fail",
    async () => {
      await authorize_admin_login(nonExistentEmailConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(), // Random non-existent email
          password: RandomGenerator.alphaNumeric(16), // Any password
        } satisfies IDiscussionBoardAdmin.ILogin,
      });
    },
  );
}
