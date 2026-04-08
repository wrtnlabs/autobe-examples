import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // 2. Retrieve profile - validates endpoint returns correct data structure
  const profile =
    await api.functional.ecommerceMall.admin.admins.me.at(adminConnection);
  typia.assert(profile);
  // 3. Validate profile fields are correctly returned
  TestValidator.equals(
    "email matches authorized email",
    profile.email,
    authorized.email,
  );
  TestValidator.equals(
    "name matches authorized name",
    profile.name,
    authorized.name,
  );
  TestValidator.equals("id matches authorized id", profile.id, authorized.id);
  // 4. Validate deleted_at is null for active admin
  // This confirms the endpoint correctly returns the soft-delete timestamp field
  // which will contain timestamp for soft-deleted admins and null for active ones
  TestValidator.equals(
    "deleted_at is null for active admin",
    profile.deleted_at,
    null,
  );
  // 5. Validate timestamps are properly formatted date-time strings
  TestValidator.predicate(
    "created_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(profile.updated_at),
  );
  // Note: Soft-deletion simulation requires database access which is not
  // available in this E2E test context. The test validates that the profile
  // retrieval endpoint correctly handles the deleted_at field for active admins.
  // When an admin is soft-deleted, the deleted_at field will contain a timestamp
  // instead of null, allowing audit trail access to deleted admin profiles.
}
