import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_super_admin_retrieval_by_authenticated_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection for registration
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register a new super admin account using utility function
  const joinResult: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
    });
  typia.assert(joinResult);
  // 3. Retrieve the super admin's profile using their ID
  const retrieved: IEcommerceMallSuperAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.at(
      superAdminConnection,
      {
        superAdminId: joinResult.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate all response fields match the join result
  TestValidator.equals("super admin id", retrieved.id, joinResult.id);
  TestValidator.equals("email matches", retrieved.email, joinResult.email);
  TestValidator.equals(
    "full name matches",
    retrieved.fullName,
    joinResult.fullName,
  );
  TestValidator.equals(
    "display name matches",
    retrieved.displayName,
    joinResult.displayName,
  );
  TestValidator.equals("grade matches", retrieved.grade, joinResult.grade);
  TestValidator.equals("status matches", retrieved.status, joinResult.status);
  TestValidator.equals(
    "created at matches",
    retrieved.createdAt,
    joinResult.createdAt,
  );
  TestValidator.equals(
    "updated at matches",
    retrieved.updatedAt,
    joinResult.updatedAt,
  );
  // Validate deleted_at is null for active account
  TestValidator.equals("deleted at is null", retrieved.deletedAt, null);
}
