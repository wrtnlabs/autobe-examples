import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that retrieving a non-existent or soft-deleted promotion request returns 404 Not Found.
 * 1. Authenticate as super administrator
 * 2. Attempt to retrieve a promotion request with an invalid/non-existent UUID
 * 3. Validate that the API throws an HTTP error with 404 status code
 */
export async function test_api_admin_promotion_request_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
      ip: "127.0.0.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Generate an invalid/non-existent UUID
  const invalidUuid: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent promotion request and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent promotion request",
    404,
    async () =>
      await api.functional.shoppingMall.admin.admin_promotion_requests.getByPromotionrequestid(
        adminConnection,
        {
          promotionRequestId: invalidUuid,
        },
      ),
  );
}
