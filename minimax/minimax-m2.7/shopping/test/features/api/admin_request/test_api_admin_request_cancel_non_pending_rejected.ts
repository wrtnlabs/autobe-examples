import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_request_cancel_non_pending_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Authenticate as the seller
  const loggedInConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(loggedInConnection, {
    body: {
      email: sellerAuth.email,
      password: "testpassword123",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Submit an admin request (actorType: "seller")
  const adminRequestConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminRequestConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "I want to help manage the platform as an administrator.",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 4. Cancel the request (status becomes 'cancelled')
  // Note: Using seller ID as requestId - the system links admin request to seller
  const cancelledRequest =
    await api.functional.ecommerceMall.seller.admin.requests.cancel(
      adminRequestConnection,
      {
        requestId: sellerLogin.id,
      },
    );
  typia.assert(cancelledRequest);
  TestValidator.equals(
    "request status is cancelled",
    cancelledRequest.status,
    "cancelled",
  );
  // 5. Attempt to cancel the already-cancelled request again - should fail
  await TestValidator.error("cannot cancel non-pending request", async () => {
    await api.functional.ecommerceMall.seller.admin.requests.cancel(
      adminRequestConnection,
      {
        requestId: sellerLogin.id,
      },
    );
  });
}
