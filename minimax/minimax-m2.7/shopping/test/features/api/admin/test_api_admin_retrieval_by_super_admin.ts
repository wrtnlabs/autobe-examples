import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin session to authenticate
  const authenticatorConnection: api.IConnection = { host: connection.host };
  const authenticator = await authorize_super_admin_join(
    authenticatorConnection,
    {},
  );
  // Step 2: Create another admin account (target admin to retrieve)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_super_admin_join(targetConnection, {});
  // Step 3: Retrieve the target admin's details using the authenticated super admin
  const retrievedAdmin =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.at(
      authenticatorConnection,
      {
        adminId: targetAdmin.id,
      },
    );
  typia.assert(retrievedAdmin);
  // Step 4 & 5: Validate the retrieved admin details match the created account
  TestValidator.equals(
    "retrieved admin id matches",
    retrievedAdmin.id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "retrieved admin email matches",
    retrievedAdmin.email,
    targetAdmin.email,
  );
  TestValidator.equals(
    "retrieved admin deleted_at is null",
    retrievedAdmin.deleted_at,
    null,
  );
  TestValidator.predicate(
    "retrieved admin has valid created_at",
    retrievedAdmin.created_at !== null &&
      retrievedAdmin.created_at !== undefined,
  );
  TestValidator.predicate(
    "retrieved admin has valid updated_at",
    retrievedAdmin.updated_at !== null &&
      retrievedAdmin.updated_at !== undefined,
  );
}
