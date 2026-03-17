import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_admin_refund_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // 2. Create customer account
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAccount = await authorize_customer_join(
    customerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "customerPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customerAccount);
  // 3. Create seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAccount = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAccount);
  // 4. Login admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminAccount.email,
      password: "adminPassword123!",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 5. Login customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAccount.email,
      password: "customerPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 6. Login seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAccount.email,
      password: "sellerPassword123!",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 7. Generate order item ID for refund request
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 8. Customer creates refund request
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        orderItemId,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          evidence_description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 9. Seller responds to refund request (approve), creates immutable snapshot
  const sellerResponse =
    await api.functional.ecommerceMall.seller.refund_requests.approve(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          action: "approve",
        } satisfies IEcommerceMallRefundRequest.IApproval,
      },
    );
  typia.assert(sellerResponse);
  // 10. Admin retrieves snapshot
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshot =
    await api.functional.ecommerceMall.admin.refund_requests.snapshots.at(
      adminConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 11. Validate snapshot id exists
  TestValidator.equals("snapshot id exists", snapshot.id !== undefined, true);
  // 12. Validate refund request id matches
  TestValidator.equals(
    "refund request id matches",
    snapshot.refundRequestId,
    refundRequest.id,
  );
  // 13. Validate actor type is seller
  TestValidator.equals("actor type is seller", snapshot.actorType, "seller");
  // 14. Validate action type is approved (seller approve action)
  TestValidator.equals(
    "action type is approved",
    snapshot.actionType,
    "approved",
  );
  // 15. Validate status before was pending
  TestValidator.equals(
    "status before was pending",
    snapshot.statusBefore,
    "pending",
  );
  // 16. Validate status after is approved
  TestValidator.equals(
    "status after is approved",
    snapshot.statusAfter,
    "approved",
  );
  // 17. Validate reason preservation
  if (snapshot.reasonBefore !== undefined) {
    TestValidator.equals(
      "reason before preserved",
      snapshot.reasonBefore,
      refundRequest.reason,
    );
  }
  if (snapshot.reasonAfter !== undefined) {
    TestValidator.equals(
      "reason after preserved",
      snapshot.reasonAfter,
      refundRequest.reason,
    );
  }
  // 18. Validate response before was null
  TestValidator.equals(
    "response before was null",
    snapshot.responseBefore,
    null,
  );
  // 19. Validate response after is not null
  TestValidator.predicate(
    "response after is not null",
    () => snapshot.responseAfter !== null,
  );
  // 20. Validate created at is valid date-time
  TestValidator.predicate(
    "created at is valid date-time",
    () => !isNaN(Date.parse(snapshot.createdAt)),
  );
  // 21. Validate deleted at is null (active snapshot)
  TestValidator.equals("deleted at is null (active)", snapshot.deletedAt, null);
}
