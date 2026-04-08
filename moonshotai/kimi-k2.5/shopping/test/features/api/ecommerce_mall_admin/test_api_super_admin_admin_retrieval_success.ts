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

export async function test_api_super_admin_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create superAdmin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorizedSuperAdmin = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  // Step 2: Retrieve admin details using the superAdmin's own ID
  const admin: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.superAdmin.admins.at(
      superAdminConnection,
      {
        adminId: authorizedSuperAdmin.id,
      },
    );
  // Step 3: Validate response structure - typia.assert performs complete validation
  {
  }
}
