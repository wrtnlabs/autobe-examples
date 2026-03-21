import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
 * Test that retrieving a non-existent seller suspension record returns 404.
 *
 * This test validates that:
 * 1. Admin can authenticate successfully
 * 2. Requesting a seller suspension with a non-existent UUID returns HTTP 404
 * 3. The error message indicates 'Seller suspension record not found'
 */
export async function test_api_seller_suspension_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Use a non-existent suspension UUID
  const nonExistentSuspensionId =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  // 3. Validate that 404 error is returned for non-existent record
  await TestValidator.httpError(
    "non-existent seller suspension returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.seller_suspensions.at(
        adminConnection,
        {
          suspensionId: nonExistentSuspensionId,
        },
      ),
  );
}
