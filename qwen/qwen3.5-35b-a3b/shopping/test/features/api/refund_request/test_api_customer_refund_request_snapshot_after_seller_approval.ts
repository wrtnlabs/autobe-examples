import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_customer_refund_request_snapshot_after_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost:3000/customer/join",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Login customer for subsequent operations
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customer.email,
      password: "1234",
      href: "http://localhost:3000/customer/login",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(customerAuth);
  // 2. Seller setup - join and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost:3000/seller/join",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Login seller for subsequent operations
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: "1234",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerAuth);
  // 3. Create refund request (requires orderItemId, we'll generate a random UUID)
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerLoginConnection,
      {
        orderItemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          evidence_description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  const refundRequestId = refundRequest.id;
  // 4. Seller approves the refund request
  const approvedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerLoginConnection,
      {
        refundRequestId,
        body: {
          action: "approve" as const,
        } satisfies IEcommerceMallRefundRequest.IApproval,
      },
    );
  typia.assert(approvedRefundRequest);
  // 5. Customer retrieves all snapshots for the refund request
  const snapshotsResponse =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerLoginConnection,
      {
        refundRequestId,
        body: {
          limit: 10,
          sort_by: "created_at" as const,
          sort_order: "DESC" as const,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 6. Validate snapshot count
  TestValidator.equals("snapshot count", snapshotsResponse.data.length, 2);
  // 7. Validate snapshots are ordered chronologically (newest first)
  TestValidator.predicate(
    "snapshots ordered newest first",
    () =>
      snapshotsResponse.data[0].createdAt >=
      snapshotsResponse.data[1].createdAt,
  );
  // 8. Validate first snapshot (seller approval)
  const firstSnapshot = snapshotsResponse.data[0];
  typia.assert(firstSnapshot);
  TestValidator.equals(
    "first snapshot actor_type",
    firstSnapshot.actorType,
    "seller",
  );
  TestValidator.equals(
    "first snapshot action_type",
    firstSnapshot.actionType,
    "approved",
  );
  TestValidator.equals(
    "first snapshot status_before",
    firstSnapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "first snapshot status_after",
    firstSnapshot.statusAfter,
    "approved",
  );
  // 9. Validate second snapshot (customer creation)
  const secondSnapshot = snapshotsResponse.data[1];
  typia.assert(secondSnapshot);
  TestValidator.equals(
    "second snapshot actor_type",
    secondSnapshot.actorType,
    "customer",
  );
  TestValidator.equals(
    "second snapshot action_type",
    secondSnapshot.actionType,
    "created",
  );
  TestValidator.equals(
    "second snapshot status_before",
    secondSnapshot.statusBefore,
    null,
  );
  TestValidator.equals(
    "second snapshot status_after",
    secondSnapshot.statusAfter,
    "pending",
  );
}
