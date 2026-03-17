import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_super_admin_refund_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator Setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(3),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Customer Setup and Refund Request Creation
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Generate random order item ID for refund request
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Customer Creates Refund Request
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        orderItemId: orderItemId,
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 6,
          }),
          evidence_description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 4. Super Administrator Retrieves Refund Request
  const retrievedRefundRequest =
    await api.functional.ecommerceMall.superAdmin.refund_requests.at(
      superAdminConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 5. Validate Retrieved Refund Request
  TestValidator.equals(
    "refund request id matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "customer id matches",
    retrievedRefundRequest.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "customer email matches",
    retrievedRefundRequest.customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "customer status exists",
    retrievedRefundRequest.customer.status,
    customerAuth.status,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRefundRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "order item has product name",
    retrievedRefundRequest.orderItem.productName.length > 0,
  );
  TestValidator.predicate(
    "order item has product SKU",
    retrievedRefundRequest.orderItem.productSku.length > 0,
  );
  TestValidator.predicate(
    "order item has variant name",
    retrievedRefundRequest.orderItem.variantName.length > 0,
  );
  TestValidator.equals(
    "order item quantity matches",
    retrievedRefundRequest.orderItem.quantity,
    1,
  );
  TestValidator.predicate(
    "order item has unit price",
    retrievedRefundRequest.orderItem.unitPrice > 0,
  );
  TestValidator.predicate(
    "order item total price positive",
    retrievedRefundRequest.orderItem.totalPrice > 0,
  );
  TestValidator.predicate(
    "refund request has refund code",
    retrievedRefundRequest.refundCode.length > 0,
  );
  TestValidator.predicate(
    "refund request has status",
    retrievedRefundRequest.status.length > 0,
  );
  TestValidator.equals(
    "refund request reason matches input",
    retrievedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "evidence description matches",
    retrievedRefundRequest.evidenceDescription,
    refundRequest.evidenceDescription,
  );
  TestValidator.equals(
    "seller response is null",
    retrievedRefundRequest.sellerResponse,
    null,
  );
  TestValidator.equals(
    "rejection reason is null",
    retrievedRefundRequest.rejectionReason,
    null,
  );
  TestValidator.predicate(
    "delivery date is valid date-time",
    new Date(retrievedRefundRequest.deliveryDate).getTime() > 0,
  );
  TestValidator.equals(
    "submitted_at is valid date-time",
    retrievedRefundRequest.submittedAt !== null,
    true,
  );
  TestValidator.predicate(
    "decision_at is nullable",
    retrievedRefundRequest.decisionAt === null ||
      new Date(retrievedRefundRequest.decisionAt!).getTime() > 0,
  );
  TestValidator.equals(
    "processed_at is null for pending requests",
    retrievedRefundRequest.processedAt,
    null,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(retrievedRefundRequest.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    new Date(retrievedRefundRequest.updatedAt).getTime() > 0,
  );
  TestValidator.equals(
    "refund request not soft-deleted",
    retrievedRefundRequest.deletedAt,
    null,
  );
}