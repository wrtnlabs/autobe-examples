import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminPromotionRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminPromotionRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

/**
 * Test access control that prevents customers from viewing other customers' promotion request snapshots.
 *
 * This test validates the security requirement from section 412 (Snapshot Viewing Access Violations).
 *
 * Test flow:
 * 1. Customer A registers and creates a promotion request
 * 2. Customer B (different user) registers and attempts to access Customer A's snapshots
 * 3. System should reject with unauthorized error
 */
export async function test_api_admin_promotion_request_snapshots_unauthorized_access(
  connection: api.IConnection,
) {
  // 1. Create Customer A connection and register
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 2. Customer A creates an admin promotion request
  const promotionRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerAConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallAdminPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // 3. Create Customer B connection and register (different customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 4. Verify Customer B cannot access Customer A's promotion request snapshots
  // This should throw an HTTP error (401 or 403 unauthorized)
  await TestValidator.httpError(
    "Customer B should be blocked from accessing Customer A's promotion request snapshots",
    [401, 403],
    async () => {
      await api.functional.ecommerceMall.customer.admin_promotion_requests.snapshots.index(
        customerBConnection,
        {
          promotionRequestId: promotionRequest.id,
          body: {} satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
        },
      );
    },
  );
  // 5. Verify Customer A CAN access their own snapshots (sanity check)
  const ownSnapshots =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.snapshots.index(
      customerAConnection,
      {
        promotionRequestId: promotionRequest.id,
        body: {} satisfies IEcommerceMallAdminPromotionRequestSnapshot.IRequest,
      },
    );
  typia.assert(ownSnapshots);
}
