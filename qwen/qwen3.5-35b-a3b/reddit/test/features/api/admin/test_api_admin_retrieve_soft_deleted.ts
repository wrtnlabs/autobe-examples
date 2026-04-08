import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(adminAuth);
  // 2. Retrieve the admin account we just created
  const adminConnectionRetrieve: api.IConnection = { host: connection.host };
  adminConnectionRetrieve.headers = {
    Authorization: adminAuth.token.access,
  };
  const retrievedAdmin = await api.functional.redditCommunity.admin.admins.at(
    adminConnectionRetrieve,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(retrievedAdmin);
  // 3. Validate response
  TestValidator.equals("admin ID matches", retrievedAdmin.id, adminAuth.id);
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    joinBody.email,
  );
  TestValidator.equals(
    "display name matches",
    retrievedAdmin.display_name,
    joinBody.display_name,
  );
  TestValidator.equals("admin is active", retrievedAdmin.is_active, true);
  TestValidator.equals(
    "admin not soft-deleted",
    retrievedAdmin.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid",
    retrievedAdmin.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedAdmin.updated_at !== undefined,
  );
}
