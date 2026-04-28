import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator profile retrieval after registration.
 *
 * Validates the complete workflow of registering a new administrator account and retrieving their profile using the unique identifier obtained during registration. Verifies that the returned IEcommercePlatformAdmin object contains the correct id matching the registered admin, confirms isSuper is false (default for new registrations), ensures isBanned is false, and checks deletedAt is null (indicating an active account).
 *
 * 1. Register a new administrator account to obtain a valid admin ID.
 * 2. Retrieve the administrator's profile using the obtained ID.
 * 3. Validate the response fields match expected default values for a new registration.
 */
export async function test_api_admin_retrieve_profile(
  connection: api.IConnection,
) {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      password: typia.random<string & tags.Format<"password">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  const profile = await api.functional.ecommercePlatform.admins.at(
    adminConnection,
    {
      adminId: authorizedAdmin.id,
    },
  );
  typia.assert(profile);
  TestValidator.equals(
    "id matches registered admin",
    profile.id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "isSuper is false for new registration",
    profile.isSuper,
    false,
  );
  TestValidator.equals(
    "isBanned is false for new registration",
    profile.isBanned,
    false,
  );
  TestValidator.equals(
    "deletedAt is null for active account",
    profile.deletedAt,
    null,
  );
}
