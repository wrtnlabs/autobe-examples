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

export async function test_api_cancellation_request_status_retrieval_approved(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create a cancellation request (requires order item setup)
  // Note: Since we don't have order item creation API, we'll simulate the scenario
  // by assuming an existing order item with 'paid' status
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
        },
      },
    );
  typia.assert(cancellationRequest);
  // Seller approves the cancellation request
  const cancellationResponse =
    await generate_random_ecommerce_seller_cancellation_requests_responses_create(
      sellerConnection,
      {
        params: {
          cancellationRequestId: cancellationRequest.id,
        },
        body: {
          decision: "approved" as const,
          response_reason: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 10,
            wordMax: 15,
          }),
        } satisfies IEcommerceCancellationResponseRecord.ICreate,
      },
    );
  typia.assert(cancellationResponse);
  // Assuming the status record ID is available from the response or cancellation request
  // We need to simulate retrieving the status record ID
  // For this test, we'll assume we can retrieve the latest status record
  const statusRecord =
    await api.functional.ecommerce.seller.cancellation_requests.statuses.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        statusId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(statusRecord);
  // Validate the status record contains correct information
  TestValidator.equals(
    "status should be 'approved'",
    statusRecord.status,
    "approved",
  );
  TestValidator.predicate(
    "should have transition notes",
    () =>
      statusRecord.transition_notes !== null &&
      statusRecord.transition_notes !== undefined,
  );
  TestValidator.predicate(
    "should have creation timestamp",
    () =>
      statusRecord.created_at !== null && statusRecord.created_at !== undefined,
  );
  TestValidator.predicate(
    "should have update timestamp",
    () =>
      statusRecord.updated_at !== null && statusRecord.updated_at !== undefined,
  );
  TestValidator.equals(
    "cancellation request reference should match",
    statusRecord.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "customer ID should match",
    statusRecord.cancellationRequest.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "seller ID should match",
    statusRecord.cancellationRequest.seller.id,
    seller.id,
  );
}
