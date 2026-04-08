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

export async function test_api_admin_profile_update_max_length_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized: IEcommerceMallAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {});
  // 2. Create a name string exactly 100 characters long
  const maxLengthName = RandomGenerator.alphabets(100);
  // 3. Send PUT request to update profile with max length name
  const updated: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.admin.admin.profile.update(
      adminConnection,
      {
        body: {
          name: maxLengthName,
        } satisfies IEcommerceMallAdmin.IUpdate,
      },
    );
  // 4. Validate response with typia.assert
  typia.assert(updated);
  // 5. Verify the name is exactly 100 characters
  TestValidator.equals("name length is 100", updated.name.length, 100);
  TestValidator.equals("name matches input", updated.name, maxLengthName);
}
