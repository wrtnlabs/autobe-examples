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
  // 1. Setup admin actor
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create seller account
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerJoinResult);
  const sellerId = sellerJoinResult.id;
  // 3. Approve seller (requires admin connection)
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerId,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval_status is approved",
    approvedSeller.approval_status,
    "approved",
  );
  // 4. Login with approved seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerJoinResult.email,
        password: sellerPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  // 5. Validate login response tokens
  typia.assert(sellerLoginResult.token);
  typia.assert(sellerLoginResult.token.access);
  typia.assert(sellerLoginResult.token.refresh);
  typia.assert(sellerLoginResult.token.expired_at);
  typia.assert(sellerLoginResult.token.refreshable_until);
  TestValidator.equals(
    "email matches registered email",
    sellerLoginResult.email,
    sellerJoinResult.email,
  );
  TestValidator.equals("seller id matches", sellerLoginResult.id, sellerId);
  TestValidator.equals(
    "approval_status is approved",
    sellerLoginResult.approval_status,
    "approved",
  );
  TestValidator.equals("seller not banned", sellerLoginResult.is_banned, false);
  TestValidator.equals("seller not suspended", sellerLoginResult.is_suspended, false);
  typia.assert(sellerLoginResult.rejection_reason);
  typia.assert(sellerLoginResult.created_at);
  typia.assert(sellerLoginResult.updated_at);
  typia.assert(sellerLoginResult.deleted_at);
}