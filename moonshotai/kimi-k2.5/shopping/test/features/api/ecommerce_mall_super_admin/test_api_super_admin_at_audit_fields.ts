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

export async function test_api_super_admin_at_audit_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account with isolated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // Retrieve super admin record for audit verification
  const superAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.at(
      superAdminConnection,
      {
        superAdminId: authorized.id,
      },
    );
  typia.assert(superAdmin);
  // Validate audit fields - typia.assert already validated UUID format for id and date-time format for timestamps
  TestValidator.equals(
    "id matches authorized id",
    superAdmin.id,
    authorized.id,
  );
  TestValidator.equals(
    "email matches authorized email",
    superAdmin.email,
    authorized.email,
  );
  TestValidator.equals(
    "deletedAt is null for active account",
    superAdmin.deletedAt,
    null,
  );
  TestValidator.predicate(
    "createdAt <= updatedAt",
    new Date(superAdmin.createdAt) <= new Date(superAdmin.updatedAt),
  );
}
