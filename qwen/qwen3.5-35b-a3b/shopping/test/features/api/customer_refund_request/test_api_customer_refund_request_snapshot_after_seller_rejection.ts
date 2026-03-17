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

export async function test_api_customer_refund_request_snapshot_after_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerHref = typia.random<string & tags.Format<"uri">>();
  const customerReferrer = typia.random<string & tags.Format<"uri">>();
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerJoined = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: customerHref,
      referrer: customerReferrer,
    },
  });
  typia.assert(customerJoined);
  // Step 2: Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerEmail,
        password: customerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(customerLogin);
  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerHref = typia.random<string & tags.Format<"uri">>();
  const sellerReferrer = typia.random<string & tags.Format<"uri">>();
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoined = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: sellerHref,
      referrer: sellerReferrer,
    },
  });
  typia.assert(sellerJoined);
  // Step 4: Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerLogin);
  // Step 5: Customer creates refund request
  const customerRefundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerLoginConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(customerRefundRequest);
  // Step 6: Seller rejects the refund request
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 8,
    wordMax: 12,
  });
  const rejectedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerLoginConnection,
      {
        refundRequestId: customerRefundRequest.id,
        body: {
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRefundRequest);
  TestValidator.equals(
    "refund status is rejected",
    rejectedRefundRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejection reason set",
    rejectedRefundRequest.rejectionReason,
    rejectionReason,
  );
  // Step 7: Customer retrieves snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerLoginConnection,
      {
        refundRequestId: customerRefundRequest.id,
        body: {
          action_type: "rejected",
        },
      },
    );
  typia.assert(snapshotsResponse);
  // Step 8: Validate snapshot contains seller rejection
  const rejectionSnapshot = snapshotsResponse.data.find(
    (snapshot) => snapshot.actionType === "rejected",
  );
  TestValidator.predicate(
    "rejection snapshot exists",
    rejectionSnapshot !== undefined,
  );
  if (rejectionSnapshot) {
    TestValidator.equals(
      "actor is seller",
      rejectionSnapshot.actorType,
      "seller",
    );
    TestValidator.equals(
      "action type is rejected",
      rejectionSnapshot.actionType,
      "rejected",
    );
    TestValidator.equals(
      "status before is pending",
      rejectionSnapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "status after is rejected",
      rejectionSnapshot.statusAfter,
      "rejected",
    );
    TestValidator.equals(
      "response captured rejection reason",
      rejectionSnapshot.responseAfter,
      rejectionReason,
    );
  }
}