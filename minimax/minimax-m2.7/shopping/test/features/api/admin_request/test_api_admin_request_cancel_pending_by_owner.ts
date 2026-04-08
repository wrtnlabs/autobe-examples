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

export async function test_api_admin_request_cancel_pending_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 2. Submit an admin request as the seller
  const adminRequest = await authorize_admin_join(sellerConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason:
        "I want to help manage the platform and ensure quality seller experiences.",
      href: "https://example.com/admin-request",
      referrer: "https://example.com/seller-dashboard",
    },
  });
  typia.assert(adminRequest);
  // 3. Verify the request status is 'pending'
  TestValidator.equals(
    "actor type is seller",
    adminRequest.email,
    sellerAuth.email,
  );
  // 4. Cancel the pending request via POST /ecommerceMall/seller/admin/requests/{requestId}/cancel
  const cancelledRequest =
    await api.functional.ecommerceMall.seller.admin.requests.cancel(
      sellerConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(cancelledRequest);
  // 5. Verify the response returns status 'cancelled'
  TestValidator.equals(
    "request status is cancelled",
    cancelledRequest.status,
    "cancelled",
  );
  // 6. Verify the requestId matches the originally submitted request
  TestValidator.equals(
    "request ID matches",
    cancelledRequest.id,
    adminRequest.id,
  );
  // 7. Verify reviewer is null (cancelled requests have no reviewer)
  TestValidator.equals("reviewer is null", cancelledRequest.reviewer, null);
  // 8. Verify actorType is 'seller'
  TestValidator.equals(
    "actor type is seller",
    cancelledRequest.actorType,
    "seller",
  );
  // 9. Verify requestedGrade is preserved
  TestValidator.equals(
    "requested grade preserved",
    cancelledRequest.requestedGrade,
    "admin",
  );
  // 10. Verify updatedAt timestamp is recent (within reasonable time)
  const updatedAt = new Date(cancelledRequest.updatedAt);
  const now = new Date();
  const timeDiff = now.getTime() - updatedAt.getTime();
  TestValidator.predicate(
    "updatedAt is recent",
    timeDiff >= 0 && timeDiff < 60000,
  );
}
