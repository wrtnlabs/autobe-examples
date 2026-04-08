import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_snapshot_access_denied_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await api.functional.ecommerceMall.auth.customer.join(
    customerAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  customerAConnection.headers = { Authorization: customerAAuth.token.access };
  // 2. Register and authenticate Seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  sellerConnection.headers = { Authorization: sellerAuth.token.access };
  // 3. Create refund request for Customer A using generation function
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerAConnection,
      {
        body: typia.random<IEcommerceMallRefundRequest.ICreate>(),
      },
    );
  typia.assert(refundRequest);
  // 4. Seller approves refund request to create snapshot
  await api.functional.ecommerceMall.seller.refund_requests.approve(
    sellerConnection,
    {
      requestId: refundRequest.id,
    },
  );
  // 5. List snapshots to get snapshotId
  const snapshotsPage =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.list(
      customerAConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(snapshotsPage);
  const snapshotId = snapshotsPage.data[0]?.id;
  // 6. Register and authenticate Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBToken = await api.functional.ecommerceMall.auth.customer.join(
    customerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  customerBConnection.headers = { Authorization: customerBToken.token.access };
  // 7. Customer B attempts to access Customer A's refund request snapshot
  // This should be denied with 403 Forbidden
  await TestValidator.httpError(
    "customer B cannot access other customer's refund request snapshot",
    [403, 404],
    async () => {
      await api.functional.ecommerceMall.customer.refund_requests.snapshots.at(
        customerBConnection,
        {
          requestId: refundRequest.id,
          snapshotId: snapshotId!,
        },
      );
    },
  );
  // 8. Additional validation: Customer A can still access their own snapshot
  const customerAGetSnapshot =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.at(
      customerAConnection,
      {
        requestId: refundRequest.id,
        snapshotId: snapshotId!,
      },
    );
  typia.assert(customerAGetSnapshot);
  TestValidator.predicate(
    "snapshot belongs to Customer A",
    customerAGetSnapshot.customer.id === customerAAuth.id,
  );
}