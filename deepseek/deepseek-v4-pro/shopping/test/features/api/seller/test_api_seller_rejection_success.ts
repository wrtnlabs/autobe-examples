import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
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

export async function test_api_seller_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a new seller with known credentials (starts in pending status)
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(seller);
  // 3. Administrator rejects the pending seller
  const rejectionReason =
    "Your registration has been rejected due to incomplete business documentation. Please provide your business license and tax registration certificate before resubmitting.";
  const rejectedSeller = await api.functional.shoppingMall.admin.sellers.reject(
    adminConnection,
    {
      sellerId: seller.id,
      body: {
        rejection_reason: rejectionReason,
      } satisfies IShoppingMallSeller.IReject,
    },
  );
  typia.assert(rejectedSeller);
  // 4. Validate rejection response
  TestValidator.equals(
    "approval status is rejected",
    rejectedSeller.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason matches submitted text",
    rejectedSeller.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "updated_at timestamp reflects rejection time",
    new Date(rejectedSeller.updated_at).getTime() >=
      new Date(seller.created_at).getTime(),
  );
  // 5. Seller logs in to verify they can see the rejection status and reason
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerRecheck = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerRecheck);
  TestValidator.equals(
    "seller sees rejected approval status",
    sellerRecheck.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "seller sees the rejection reason",
    sellerRecheck.rejection_reason,
    rejectionReason,
  );
}
