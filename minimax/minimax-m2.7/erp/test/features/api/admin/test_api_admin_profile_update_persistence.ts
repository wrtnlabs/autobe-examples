import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_profile_update_persistence(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account using authorize_admin_join utility
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate a unique display_name for testing persistence
  const uniqueDisplayName = `Admin_${RandomGenerator.alphaNumeric(12)}`;
  // 3. Update profile with unique display_name
  const updatedProfile = await api.functional.erpHrm.admin.profile.update(
    adminConnection,
    {
      body: {
        display_name: uniqueDisplayName,
      } satisfies IErpHrmMember.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Retrieve profile again (update endpoint returns updated profile)
  const retrievedProfile = await api.functional.erpHrm.admin.profile.update(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(retrievedProfile);
  // 5. Validate persistence - display_name should match the unique value
  TestValidator.equals(
    "display_name persisted correctly",
    retrievedProfile.display_name,
    uniqueDisplayName,
  );
}
