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

export async function test_api_admin_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const authorized = await authorize_admin_join(connection, {});
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  // 3. Generate new display name
  const newName = RandomGenerator.name();
  // 4. Update admin profile with new display name
  const updatedProfile =
    await api.functional.ecommerceMall.admin.admin.profile.update(
      adminConnection,
      {
        body: {
          name: newName,
        } satisfies IEcommerceMallAdmin.IUpdate,
      },
    );
  // 5. Validate response structure
  typia.assert(updatedProfile);
  // 6. Validate business logic
  TestValidator.equals(
    "updated name matches input",
    updatedProfile.name,
    newName,
  );
  TestValidator.equals(
    "email unchanged",
    updatedProfile.email,
    authorized.email,
  );
  TestValidator.equals("deleted_at is null", updatedProfile.deleted_at, null);
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedProfile.updated_at) >= new Date(updatedProfile.created_at),
  );
}
