import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_snapshot_customer_boundary_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAEmail = typia.random<string & tags.Format<"email">>();
  const customerAResult = await authorize_customer_join(customerAConnection, {
    body: {
      email: customerAEmail,
      password: "SecurePassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAResult);
  // 2. Create a refund request as Customer A
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerAConnection,
      {},
    );
  typia.assert(refundRequest);
  // Extract refundRequestId and snapshotId from the response
  const refundRequestId = refundRequest.id;
  const snapshots = refundRequest.snapshots;
  if (!snapshots.length) {
    throw new Error("Refund request has no snapshots");
  }
  const snapshotId = snapshots[0].id;
  // 3. Authenticate as Customer B (different customer)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBEmail = typia.random<string & tags.Format<"email">>();
  const customerBResult = await authorize_customer_join(customerBConnection, {
    body: {
      email: customerBEmail,
      password: "SecurePassword123!",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerBResult);
  // 4. Attempt to access Customer A's snapshot using Customer B's credentials
  await TestValidator.error(
    "Customer B cannot access Customer A's refund request snapshot",
    async () => {
      await api.functional.ecommerceMall.customer.refund_requests.snapshots.at(
        customerBConnection,
        {
          refundRequestId,
          snapshotId,
        },
      );
    },
  );
}
