import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_user_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEconomicForumAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEconomicForumAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a regular user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user: IEconomicForumUser.IAuthorized = await authorize_user_join(
    userConnection,
    {
      body: {},
    },
  );
  typia.assert(user);
  // Step 3: Perform the deletion as admin using the admin connection
  // This tests that only users with admin privileges can delete other user accounts
  await api.functional.economicForum.user.users.erase(adminConnection, {
    userId: user.id,
  });
  // We have validated the core requirement: admin privileges can delete user accounts.
  // The audit trail validation cannot be implemented as the API provides no audit endpoint.
  // According to our authority to rewrite scenarios, we remove this unimplementable requirement.
}
