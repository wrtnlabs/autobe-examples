import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_administrator_retrieval_by_authorized_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Create admin-specific connection for retrieval test
  const adminRetrievalConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminRetrievalConnection, {
    body: {
      email: (adminAccount.email ?? "") satisfies string as string,
      password: "1234" satisfies string as string,
    },
  });
  // Retrieve administrator information
  const retrievedAdmin =
    await api.functional.shoppingMall.admin.administrators.at(
      adminRetrievalConnection,
      {
        administratorId: adminAccount.id,
      },
    );
  typia.assert(retrievedAdmin);
  // Validate retrieved administrator data matches request
  TestValidator.equals(
    "administrator ID matches",
    retrievedAdmin.id,
    adminAccount.id,
  );
  // Validate all required properties exist in IShoppingMallAdmin structure
  TestValidator.predicate(
    "has reason",
    retrievedAdmin.reason !== undefined &&
      typeof retrievedAdmin.reason === "string",
  );
  TestValidator.equals(
    "status is valid",
    retrievedAdmin.status,
    "pending" as const,
  );
  TestValidator.predicate(
    "has created_at",
    retrievedAdmin.created_at !== undefined &&
      typeof retrievedAdmin.created_at === "string",
  );
  TestValidator.predicate(
    "has requester",
    retrievedAdmin.requester !== undefined &&
      typeof retrievedAdmin.requester === "object",
  );
}
