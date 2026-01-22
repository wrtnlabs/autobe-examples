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
export async function test_api_admin_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate a new admin (creator)
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
  // Step 2: Create a second admin account to be deleted
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAdmin: ITodoListAdmin.IAuthorized = await authorize_admin_join(
    targetConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoListAdmin.IJoin,
    },
  );
  // Step 3: Use creator's connection to delete target admin (verify deletion requires auth)
  const deletedAdmin: ITodoListAdmin =
    await api.functional.todoList.admin.admins.erase(creatorConnection, {
      adminId: targetAdmin.id,
    });
  typia.assert(deletedAdmin);
  // Step 4: Validate that the returned entity matches the deleted admin's properties
  TestValidator.equals(
    "deleted admin ID matches",
    deletedAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "deleted admin email matches",
    deletedAdmin.email,
    targetAdmin.email,
  );
  TestValidator.equals(
    "deleted admin created_at matches",
    deletedAdmin.created_at,
    targetAdmin.created_at,
  );
  TestValidator.equals(
    "deleted admin updated_at matches",
    deletedAdmin.updated_at,
    targetAdmin.updated_at,
  );
  TestValidator.predicate(
    "deleted_at is set for soft delete",
    deletedAdmin.deleted_at !== null,
  );
}
