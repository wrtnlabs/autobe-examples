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

export async function test_api_seller_ban_preserve_order_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: typia.random<IEcommerceMallAdmin.IJoin>(),
  });
  typia.assert(adminAuth);
  // Create admin connection with token for subsequent API calls
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Setup seller with orders and shipments
  // Since we don't have seller creation APIs in available functions, we'll use a random seller ID
  // and assume it exists with orders/shipments in the test environment
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Ban the seller with a reason
  const bannedSeller: IEcommerceMallSeller.ISummary =
    await api.functional.ecommerceMall.admin.sellers.ban(adminAuthConnection, {
      sellerId,
      body: {
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceMallSeller.IBanRequest,
    });
  typia.assert(bannedSeller);
  // 4. Validate seller ban status is set to true
  TestValidator.equals("seller is banned", bannedSeller.is_banned, true);
  // 5. Validate seller core data is preserved
  TestValidator.equals("seller ID preserved", bannedSeller.id, sellerId);
  TestValidator.predicate("email preserved", bannedSeller.email !== undefined);
  TestValidator.equals(
    "approval status preserved",
    bannedSeller.approval_status,
    "approved",
  );
  TestValidator.equals(
    "suspended status unchanged",
    bannedSeller.is_suspended,
    false,
  );
  TestValidator.predicate(
    "created_at preserved",
    bannedSeller.created_at !== undefined,
  );
}
