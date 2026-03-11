import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admins_retrieve_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  typia.assert(joinResult);
  // Retrieve admin details using the created admin's ID
  const retrievedAdmin = await api.functional.multiUserTodo.admins.at(
    adminConnection,
    {
      adminId: joinResult.id,
    },
  );
  typia.assert(retrievedAdmin);
  // Validate response structure
  TestValidator.equals("admin ID matches", retrievedAdmin.id, joinResult.id);
  TestValidator.equals("email matches", retrievedAdmin.email, joinResult.email);
  TestValidator.equals(
    "display name matches",
    retrievedAdmin.display_name,
    joinResult.display_name,
  );
  TestValidator.predicate("created_at is valid ISO datetime", () => {
    const date = new Date(retrievedAdmin.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO datetime", () => {
    const date = new Date(retrievedAdmin.updated_at);
    return !isNaN(date.getTime());
  });
  TestValidator.equals(
    "deleted_at is null for active account",
    retrievedAdmin.deleted_at,
    null,
  );
  // Validate timestamp logic
  const createdAt = new Date(retrievedAdmin.created_at);
  const updatedAt = new Date(retrievedAdmin.updated_at);
  TestValidator.predicate(
    "created_at should be before or equal to updated_at",
    createdAt <= updatedAt,
  );
}
