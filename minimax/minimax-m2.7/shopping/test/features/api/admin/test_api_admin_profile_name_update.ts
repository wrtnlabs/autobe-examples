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

export async function test_api_admin_profile_name_update(
  connection: api.IConnection,
): Promise<void> {
  // Test that a super administrator can successfully update an admin's display name.
  // Prerequisites Setup:
  // 1. SuperAdmin A joins to authenticate as the acting super administrator
  // 2. SuperAdmin B joins to create the target admin account to be updated
  // Create SuperAdmin A (acting super administrator who will perform the update)
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_admin_join(superAdminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdminA);
  // Create SuperAdmin B (target admin account to be updated)
  const superAdminBConnection: api.IConnection = { host: connection.host };
  const superAdminB = await authorize_super_admin_join(superAdminBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdminB);
  // Generate new display name for the update
  const newName = RandomGenerator.name();
  // Test Execution:
  // SuperAdmin A sends PATCH request to /ecommerceMall/superAdmin/admins/{SuperAdminB.id}
  // with request body containing only the "name" field
  const updatedAdmin =
    await api.functional.ecommerceMall.superAdmin.admins.update(
      superAdminAConnection,
      {
        adminId: superAdminB.id,
        body: {
          name: newName,
        } satisfies IEcommerceMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin);
  // Expected Results:
  // - Response body contains IEcommerceMallAdmin with updated name
  TestValidator.equals("updated name matches", updatedAdmin.name, newName);
  // - Original email remains unchanged
  TestValidator.equals(
    "email unchanged",
    updatedAdmin.email,
    superAdminB.email,
  );
  // - ID remains the same
  TestValidator.equals("id unchanged", updatedAdmin.id, superAdminB.id);
  // - deleted_at should be null (not deleted)
  TestValidator.equals("not deleted", updatedAdmin.deleted_at, null);
  // - updated_at should be updated (will be validated by typia.assert as valid date-time)
  TestValidator.predicate(
    "has updated_at timestamp",
    updatedAdmin.updated_at !== undefined,
  );
}
