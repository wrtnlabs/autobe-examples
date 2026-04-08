import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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

export async function test_api_superadmin_profile_update_both_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate random values for both fields
  const newDisplayName = RandomGenerator.name() satisfies string &
    tags.MinLength<1> &
    tags.MaxLength<100>;
  const newPhone = RandomGenerator.mobile() satisfies string &
    tags.MinLength<10> &
    tags.MaxLength<20>;
  // 3. Update profile with both fields simultaneously
  const updatedProfile =
    await api.functional.ecommerceMall.superAdmin.profile.update(
      superAdminConnection,
      {
        body: {
          displayName: newDisplayName,
          phone: newPhone,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate both fields are updated
  TestValidator.equals(
    "displayName updated",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.equals("phone updated", updatedProfile.phone, newPhone);
  // 5. Validate updatedAt timestamp is recent
  const updatedAtTime = new Date(updatedProfile.updatedAt).getTime();
  const now = Date.now();
  TestValidator.predicate(
    "updatedAt is recent",
    Math.abs(now - updatedAtTime) < 60000,
  );
}
