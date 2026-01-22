import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_account_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a connection and authenticate as an admin to perform updates
  const creatorConnection: api.IConnection = { host: connection.host };
  const createdAdmin: ITodoListAdmin.IAuthorized = await authorize_admin_join(
    creatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListAdmin.IJoin,
    },
  );
  typia.assert(createdAdmin);
  // Step 2: Create a target admin account to update
  const targetAdminConnection: api.IConnection = { host: connection.host };
  const targetAdmin: ITodoListAdmin.IAuthorized = await authorize_admin_join(
    targetAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListAdmin.IJoin,
    },
  );
  typia.assert(targetAdmin);
  // Step 3: Create a new connection for the update request with the creator's token
  const updateConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: createdAdmin.token.access },
  };
  // Step 4: Update the target admin's email address using the authenticated admin connection
  const newEmail: string = typia.random<string & tags.Format<"email">>();
  const updatedAdmin: ITodoListAdmin =
    await api.functional.todoList.admin.admins.update(updateConnection, {
      adminId: targetAdmin.id,
      body: {
        email: newEmail,
      } satisfies ITodoListAdmin.IUpdate,
    });
  typia.assert(updatedAdmin);
  // Step 5: Validate that the update was successful
  TestValidator.equals(
    "updated admin email matches",
    updatedAdmin.email,
    newEmail,
  );
  TestValidator.notEquals(
    "target admin email was changed",
    targetAdmin.email,
    updatedAdmin.email,
  );
  TestValidator.equals(
    "updated admin id unchanged",
    updatedAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "updated admin created_at unchanged",
    updatedAdmin.created_at,
    targetAdmin.created_at,
  );
  TestValidator.equals(
    "updated admin deleted_at unchanged",
    updatedAdmin.deleted_at,
    targetAdmin.deleted_at,
  );
}
