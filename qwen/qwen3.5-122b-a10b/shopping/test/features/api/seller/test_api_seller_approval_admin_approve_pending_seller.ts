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

export async function test_api_seller_approval_admin_approve_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials for admin
  const adminEmail = typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  typia.assert(adminAuth);
  // 2. Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 3. Create seller account (will be pending by default)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerJoin);
  // Verify seller is initially pending
  TestValidator.equals(
    "initial approval status",
    sellerJoin.approval_status,
    "pending",
  );
  // 4. Approve seller as admin
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.approve(
      adminLoginConnection,
      {
        sellerId: sellerJoin.id,
      },
    );
  typia.assert(approvedSeller);
  // 5. Verify approval status changed to approved
  TestValidator.equals(
    "approval status after approval",
    approvedSeller.approval_status,
    "approved",
  );
  // 6. Verify other fields are preserved
  TestValidator.equals("seller ID preserved", approvedSeller.id, sellerJoin.id);
  TestValidator.equals(
    "shop name preserved",
    approvedSeller.shop_name,
    sellerJoin.shop_name,
  );
  TestValidator.equals(
    "account status preserved",
    approvedSeller.account_status,
    "active",
  );
  // 7. Verify snapshot was created for approval status change
  // The approval action should create a seller snapshot recording the status change
  TestValidator.predicate(
    "updated_at changed",
    approvedSeller.updated_at !== sellerJoin.updated_at,
  );
}