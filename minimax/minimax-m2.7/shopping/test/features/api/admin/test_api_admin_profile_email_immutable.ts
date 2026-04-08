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

export async function test_api_admin_profile_email_immutable(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  // 2. Record original email from auth response
  const originalEmail = authorized.email;
  typia.assert(authorized);
  // 3. Send profile update with new name (email cannot be sent - not in IUpdate type)
  const newName = "New Admin Name";
  const updatedProfile =
    await api.functional.ecommerceMall.admin.admin.profile.update(
      adminConnection,
      {
        body: {
          name: newName,
        } satisfies IEcommerceMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 4. Validate email remains unchanged (immutable)
  TestValidator.equals("email unchanged", updatedProfile.email, originalEmail);
  // 5. Validate name was updated
  TestValidator.equals("name updated", updatedProfile.name, newName);
}
