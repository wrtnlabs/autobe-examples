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

export async function test_api_refund_request_snapshots_seller_viewing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
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
  typia.assert(seller);
  // 2. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 3. Customer creates a refund request (creates initial snapshot)
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const refundRequest: IEcommerceMallRefundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 4,
            wordMax: 8,
          }),
          evidence_description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
        params: {
          orderItemId,
        },
      },
    );
  typia.assert(refundRequest);
  // 4. Seller retrieves snapshot history for this refund request
  const snapshots: IPageIEcommerceMallRefundRequestSnapshot.ISummary =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          limit: 50,
          sort_by: "created_at" as const,
          sort_order: "DESC" as const,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Verify snapshots are returned
  TestValidator.equals(
    "snapshots count",
    snapshots.data.length,
    snapshots.pagination.records,
  );
  TestValidator.equals("pagination current", snapshots.pagination.current, 1);
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 50);
  // 6. Verify at least one snapshot exists (initial creation)
  TestValidator.predicate("has snapshots", snapshots.data.length > 0);
  // 7. Verify each snapshot has required immutable fields
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    // Verify immutable fields are correctly set
    TestValidator.equals(
      "snapshot refund request id",
      snapshot.refundRequestId,
      refundRequest.id,
    );
    TestValidator.predicate(
      "snapshot actor type valid",
      ["customer", "seller", "admin", "super_admin"].includes(
        snapshot.actorType,
      ),
    );
    TestValidator.predicate(
      "snapshot action type valid",
      [
        "created",
        "status_changed",
        "approved",
        "rejected",
        "response_added",
      ].includes(snapshot.actionType),
    );
    TestValidator.predicate(
      "snapshot has creation timestamp",
      snapshot.createdAt !== undefined,
    );
  }
  // 8. Verify snapshots are sorted in DESC order (newest first)
  if (snapshots.data.length > 1) {
    for (let i = 0; i < snapshots.data.length - 1; i++) {
      const currentTime = new Date(snapshots.data[i].createdAt).getTime();
      const nextTime = new Date(snapshots.data[i + 1].createdAt).getTime();
      TestValidator.predicate("snapshots sorted DESC", currentTime >= nextTime);
    }
  }
}