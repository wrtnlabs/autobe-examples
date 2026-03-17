import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
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

export async function test_api_customer_refund_request_snapshot_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
      ip: typia.random<(string & tags.Format<"ipv4">)>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create refund request (auto-creates initial 'created' snapshot)
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          evidence_description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 6,
          }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
        params: {
          orderItemId: typia.random<(string & tags.Format<"uuid">)>()
        },
      },
    );
  typia.assert(refundRequest);
  // 3. Query snapshots for this refund request
  const snapshotsResponse =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {} satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "has pagination",
    snapshotsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    snapshotsResponse.data !== undefined,
    true,
  );
  // 5. Validate initial snapshot exists
  TestValidator.predicate(
    "at least one snapshot exists",
    snapshotsResponse.data.length > 0,
  );
  // 6. Validate first snapshot metadata
  const firstSnapshot = snapshotsResponse.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "snapshot has correct refund request id",
    firstSnapshot.refundRequestId,
    refundRequest.id,
  );
  TestValidator.equals(
    "snapshot actor type is customer",
    firstSnapshot.actorType,
    "customer",
  );
  TestValidator.equals(
    "snapshot action type is created",
    firstSnapshot.actionType,
    "created",
  );
  TestValidator.equals(
    "snapshot status before is null for created action",
    firstSnapshot.statusBefore,
    null,
  );
  TestValidator.predicate(
    "snapshot has valid created_at timestamp",
    firstSnapshot.createdAt !== undefined &&
      new Date(firstSnapshot.createdAt) instanceof Date,
  );
}