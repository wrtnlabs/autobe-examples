import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const createdAdmin: ICommunityBbsAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    });
  typia.assert(createdAdmin);
  // Step 2: Use the created admin's ID to retrieve their profile
  const retrievedAdmin: ICommunityBbsAdmin =
    await api.functional.communityBbs.admin.admins.at(adminConnection, {
      adminId: createdAdmin.id,
    });
  typia.assert(retrievedAdmin);
  // Step 3: Validate all required fields are present with correct types and values
  TestValidator.equals("admin ID matches", retrievedAdmin.id, createdAdmin.id);
  TestValidator.equals(
    "admin username matches",
    retrievedAdmin.username,
    createdAdmin.username,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    createdAdmin.email,
  );
  TestValidator.equals(
    "admin status matches",
    retrievedAdmin.status,
    createdAdmin.status,
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
}
