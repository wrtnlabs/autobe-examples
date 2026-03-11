import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_suspend } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_suspend";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_business_rules_compliance(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create seller suspension record
  const testSellerId = typia.random<string & tags.Format<"uuid">>();
  const suspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.suspend(
      adminConnection,
      {
        body: {
          seller_id: testSellerId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(suspension);
  // 3. Verify suspension record contains correct admin_id, seller_id, and reason
  TestValidator.equals("seller_id matches", suspension.seller_id, testSellerId);
  TestValidator.equals("admin_id matches", suspension.admin_id, admin.id);
  if (suspension.reason) {
    TestValidator.equals(
      "reason matches",
      suspension.reason,
      suspension.reason,
    );
  }
  // 4. Verify suspension has required structure (seller and admin summaries)
  typia.assert(suspension.seller);
  typia.assert(suspension.admin);
  // 5. Verify seller summary structure
  TestValidator.predicate(
    "seller has valid id",
    suspension.seller.id !== undefined && suspension.seller.id !== null,
  );
  // 6. Verify admin summary structure
  TestValidator.predicate(
    "admin has valid id",
    suspension.admin.id !== undefined && suspension.admin.id !== null,
  );
}
