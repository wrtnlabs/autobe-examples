import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_account_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create admin account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: "admin",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Retrieve the admin account by ID
  const retrievedAdmin = await api.functional.communityPlatform.admins.at(
    adminConnection,
    {
      adminId: adminAccount.id,
    },
  );
  typia.assert(retrievedAdmin);
  // Validate all expected fields are present
  TestValidator.equals("admin ID matches", retrievedAdmin.id, adminAccount.id);
  TestValidator.equals(
    "email matches",
    retrievedAdmin.email,
    adminAccount.email,
  );
  TestValidator.equals(
    "display name matches",
    retrievedAdmin.display_name,
    adminAccount.display_name,
  );
  TestValidator.equals(
    "permissions level matches",
    retrievedAdmin.permissions_level,
    adminAccount.permissions_level,
  );
  TestValidator.predicate("is active", retrievedAdmin.is_active === true);
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedAdmin.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    new Date(retrievedAdmin.updated_at).getTime() > 0,
  );
  TestValidator.equals("deleted_at is null", retrievedAdmin.deleted_at, null);
  // Validate timestamps are ISO strings
  TestValidator.predicate(
    "created_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAdmin.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedAdmin.updated_at),
  );
}
