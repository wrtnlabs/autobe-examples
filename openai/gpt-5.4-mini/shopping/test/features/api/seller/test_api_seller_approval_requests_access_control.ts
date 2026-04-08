import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verifies seller approval request list access control.
 *
 * Ensures the approval-request review list cannot be accessed without seller authentication and that the endpoint enforces authorization before returning any paginated governance data.
 *
 * 1. Attempt to call the approval-request list endpoint without authentication.
 * 2. Verify the call is rejected with an HTTP authorization error.
 * 3. Create a separate authenticated seller connection to confirm actor-specific connection isolation.
 */
export async function test_api_seller_approval_requests_access_control(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "seller approval requests should reject unauthenticated access",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.approval_requests.index(
        unauthorizedConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
        },
      );
    },
  );
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  await TestValidator.httpError(
    "seller approval requests should reject authenticated seller access",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.approval_requests.index(
        sellerConnection,
        {
          body: {
            page: 1,
            limit: 1,
          } satisfies IMallPlatformAdministratorApprovalRequest.IRequest,
        },
      );
    },
  );
}
