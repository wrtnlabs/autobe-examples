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
export async function test_api_admin_account_retrieval_by_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const createdAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoListAdmin.IJoin,
  });
  typia.assert(createdAdmin);
  // Step 2: Use the email from created admin to retrieve the account
  const retrievedAdmin = await api.functional.todoList.admins.at(connection, {
    email: createdAdmin.email,
  });
  typia.assert(retrievedAdmin);
  // Step 3: Validate the retrieved admin account has all required fields
  TestValidator.equals("admin id matches", retrievedAdmin.id, createdAdmin.id);
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "admin created_at matches",
    retrievedAdmin.created_at,
    createdAdmin.created_at,
  );
  TestValidator.equals(
    "admin updated_at matches",
    retrievedAdmin.updated_at,
    createdAdmin.updated_at,
  );
  TestValidator.equals("admin is not deleted", retrievedAdmin.deleted_at, null);
}
