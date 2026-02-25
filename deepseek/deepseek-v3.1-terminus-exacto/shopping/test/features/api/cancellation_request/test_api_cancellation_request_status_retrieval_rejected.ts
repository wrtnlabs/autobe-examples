import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestStatus";
import type { IEcommerceCancellationResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationResponseRecord";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_cancellation_requests_create";
import { generate_random_ecommerce_seller_cancellation_requests_responses_create } from "../../../generate/generate_random_ecommerce_seller_cancellation_requests_responses_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";
import { prepare_random_ecommerce_cancellation_response_record } from "../../../prepare/prepare_random_ecommerce_cancellation_response_record";

export async function test_api_cancellation_request_status_retrieval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Seller authentication using available utility function
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
      href: "https://test.com",
      referrer: "https://test.com",
      ip: null,
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create customer-specific connection
  const customerConnection: api.IConnection = { host: connection.host };
  // Customer authentication using available utility function
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Create cancellation request using available utility function
  const cancellationRequest =
    await generate_random_ecommerce_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 15,
          }),
        } satisfies IEcommerceCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // Seller rejects the cancellation request using available utility function
  const rejectionReason = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 10,
    wordMax: 15,
  });
  const rejectionResponse =
    await generate_random_ecommerce_seller_cancellation_requests_responses_create(
      sellerConnection,
      {
        params: { cancellationRequestId: cancellationRequest.id },
        body: {
          decision: "rejected" as const,
          response_reason: rejectionReason,
        } satisfies IEcommerceCancellationResponseRecord.ICreate,
      },
    );
  typia.assert(rejectionResponse);
  // For status retrieval, we need to get the status ID from the cancellation request status history
  // Since we don't have a status listing API, we'll need to rely on the response creating a status record
  // We'll assume the latest status can be retrieved by the response timestamp
  // Validate the rejection was properly recorded in the status history
  // Note: This is a simplified approach - in a real scenario we'd list statuses first
  const statusRecord =
    await api.functional.ecommerce.seller.cancellation_requests.statuses.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        statusId: rejectionResponse.id, // Using response ID as approximation
      },
    );
  typia.assert(statusRecord);
  // Validate the status record properties
  TestValidator.equals(
    "status should indicate rejection",
    statusRecord.status,
    "rejected",
  );
  TestValidator.predicate(
    "transition notes should exist",
    statusRecord.transition_notes !== null &&
      statusRecord.transition_notes !== undefined &&
      statusRecord.transition_notes.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp should be valid",
    new Date(statusRecord.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    new Date(statusRecord.updated_at).getTime() > 0,
  );
  TestValidator.equals(
    "cancellation request ID should match",
    statusRecord.cancellationRequest.id,
    cancellationRequest.id,
  );
  // Validate the audit trail integrity
  TestValidator.predicate(
    "status transition should be properly timestamped",
    new Date(statusRecord.created_at) <= new Date(),
  );
  TestValidator.predicate(
    "status should reference correct cancellation request",
    statusRecord.cancellationRequest.id === cancellationRequest.id,
  );
}