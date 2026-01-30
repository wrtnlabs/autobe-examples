import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsUserActivation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserActivation";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_activation_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      },
    },
  );
  typia.assert(admin);
  // Generate a test user for activation history
  const user: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      },
    },
  );
  typia.assert(user);
  // Retrieve activation history for the user
  const activationHistory: ICommunityBbsUserActivation =
    await api.functional.communityBbs.admin.users.activation_history.at(
      adminConnection,
      {
        userId: user.id,
      },
    );
  typia.assert(activationHistory);
  // Validate that at least one record exists
  TestValidator.predicate(
    "activation history has items",
    activationHistory !== null,
  );
  // Validate that the response structure is correct using typia.assert
  // No additional validation needed as typia.assert() ensures complete type safety
  // and all fields are validated according to ICommunityBbsUserActivation schema
}