import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new admin account using authorization function
  const adminConnection: api.IConnection = { host: connection.host };
  const newAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$">
      >(),
    },
  });
  // Retrieve admin profile using the authenticated connection
  const profile = await api.functional.admin.me(adminConnection);
  // Validate all REQUIRED profile properties with TypeSafe assertions and TestValidator
  typia.assert(profile);
  TestValidator.equals("ID matches", newAdmin.id, profile.id);
  TestValidator.equals("email matches", newAdmin.email, profile.email);
  TestValidator.equals("status matches", newAdmin.status, profile.status);
}
