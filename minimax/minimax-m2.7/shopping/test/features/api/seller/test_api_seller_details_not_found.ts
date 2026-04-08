import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
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
 * Test that an administrator receives 404 Not Found when viewing a non-existent seller.
 *
 * Validates proper error handling when an invalid or non-existent seller ID is provided to the admin seller details endpoint. This test ensures that the API correctly responds with a 404 status code when attempting to retrieve details for a seller that does not exist in the system.
 *
 * 1. Administrator authenticates via admin join endpoint using utility function.
 * 2. Generates a random UUID that does not exist in the system.
 * 3. Attempts to retrieve seller details using the non-existent UUID.
 * 4. Verifies that the API returns 404 Not Found status code.
 */
export async function test_api_seller_details_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate non-existent seller UUID
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent seller details
  // 4. Verify 404 Not Found response
  await TestValidator.httpError(
    "non-existent seller returns 404",
    404,
    async () =>
      await api.functional.ecommerceMall.admin.admin.sellers.at(
        adminConnection,
        {
          sellerId: nonExistentSellerId,
        },
      ),
  );
}
