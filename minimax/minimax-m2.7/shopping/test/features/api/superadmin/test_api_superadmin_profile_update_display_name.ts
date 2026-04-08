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

export async function test_api_superadmin_profile_update_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super admin using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Generate new display name for update
  const newDisplayName = RandomGenerator.name();
  // 3. Update profile with new displayName, omitting phone field (partial update)
  const updatedProfile =
    await api.functional.ecommerceMall.superAdmin.profile.update(
      superAdminConnection,
      {
        body: {
          displayName: newDisplayName satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<100>,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate the response
  TestValidator.equals(
    "displayName updated to new value",
    updatedProfile.displayName,
    newDisplayName,
  );
  TestValidator.predicate(
    "updatedAt timestamp reflects current update",
    new Date(updatedProfile.updatedAt).getTime() > Date.now() - 60000,
  );
}
