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

export async function test_api_admin_profile_self_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account through join operation
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create authenticated connection for self-view request
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: joinResult.token.access };
  // 3. Retrieve own profile using adminId from join result
  const adminProfile = await api.functional.ecommerceMall.admin.admins.at(
    adminConnection,
    {
      adminId: joinResult.id,
    },
  );
  typia.assert(adminProfile);
  // 4. Validate response structure and fields
  TestValidator.equals(
    "admin id is valid UUID",
    true,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      adminProfile.id,
    ),
  );
  TestValidator.equals(
    "email matches join email",
    adminProfile.email,
    joinResult.email,
  );
  TestValidator.equals(
    "isBanned is false for new admin",
    adminProfile.isBanned,
    false,
  );
  TestValidator.equals(
    "banReason is null for non-banned admin",
    adminProfile.banReason,
    null,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    !Number.isNaN(Date.parse(adminProfile.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    !Number.isNaN(Date.parse(adminProfile.updatedAt)),
  );
  // 5. Verify password_hash is excluded from response (security check)
  const profileKeys = Object.keys(adminProfile);
  TestValidator.equals(
    "password_hash excluded from profile response",
    profileKeys.includes("password_hash"),
    false,
  );
  // 6. Verify id matches requesting admin's id (self-view)
  TestValidator.equals(
    "profile id matches requesting admin id",
    adminProfile.id,
    joinResult.id,
  );
}
