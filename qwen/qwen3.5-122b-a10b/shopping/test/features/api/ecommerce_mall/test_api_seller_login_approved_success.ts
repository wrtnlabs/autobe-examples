import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_seller_login_approved_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinResult = await authorize_admin_join(connection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(adminJoinResult);
  // 2. Login as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminJoinResult.token.access, // Use the password we set
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  // 3. Create seller account with pending approval
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinResult = await authorize_seller_join(connection, {
    body: typia.random<IEcommerceMallSeller.IJoin>(),
  });
  typia.assert(sellerJoinResult);
  // Verify initial status is pending
  TestValidator.equals(
    "initial approval status",
    sellerJoinResult.approval_status,
    "pending",
  );
  // 4. Approve seller account using admin connection
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerJoinResult.id,
    });
  typia.assert(approvedSeller);
  // Verify approval status changed to approved
  TestValidator.equals(
    "approval status after admin approval",
    approvedSeller.approval_status,
    "approved",
  );
  // 5. Login as approved seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerJoinResult.token.access, // Use the password we set
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLoginResult);
  // 6. Validate login response
  TestValidator.equals(
    "seller ID matches",
    sellerLoginResult.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "shop name matches",
    sellerLoginResult.shop_name,
    sellerJoinResult.shop_name,
  );
  TestValidator.equals(
    "approval status is approved",
    sellerLoginResult.approval_status,
    "approved",
  );
  TestValidator.equals(
    "account status is active",
    sellerLoginResult.account_status,
    "active",
  );
  // 7. Validate token structure
  TestValidator.predicate(
    "access token exists",
    sellerLoginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    sellerLoginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      sellerLoginResult.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      sellerLoginResult.token.refreshable_until,
    ),
  );
  // 8. Validate seller summary
  TestValidator.equals(
    "seller summary ID matches",
    sellerLoginResult.seller.id,
    sellerJoinResult.id,
  );
  TestValidator.equals(
    "seller summary email matches",
    sellerLoginResult.seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "seller summary approval status",
    sellerLoginResult.seller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "seller summary account status",
    sellerLoginResult.seller.account_status,
    "active",
  );
}