import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
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

export async function test_api_cancellation_response_modification_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // Create cancellation request and response setup
  // Note: We need to create a valid cancellation request first
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);
  // Create cancellation request
  const cancellationRequest =
    await api.functional.ecommerce.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }).substring(0, 200),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Create initial cancellation response
  const initialResponse =
    await api.functional.ecommerce.seller.cancellation_requests.responses.create(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "approved",
          response_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 8,
          }).substring(0, 200),
        },
      },
    );
  typia.assert(initialResponse);
  // Test 1: Valid update to response reason within boundaries
  const updatedResponse =
    await api.functional.ecommerce.seller.cancellation_requests.responses.putByCancellationrequestidAndResponseid(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        responseId: initialResponse.id,
        body: {
          response_reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 8,
          }).substring(0, 200),
        },
      },
    );
  typia.assert(updatedResponse);
  TestValidator.notEquals(
    "response reason should be updated",
    initialResponse.response_reason,
    updatedResponse.response_reason,
  );
  TestValidator.equals(
    "decision should remain unchanged",
    updatedResponse.decision,
    initialResponse.decision,
  );
  // Test 2: Invalid response reason - too short (less than 10 characters)
  await TestValidator.error(
    "should reject response reason with insufficient length",
    async () => {
      await api.functional.ecommerce.seller.cancellation_requests.responses.putByCancellationrequestidAndResponseid(
        sellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          responseId: initialResponse.id,
          body: {
            response_reason: "Short",
          },
        },
      );
    },
  );
  // Test 3: Invalid response reason - too long (more than 500 characters)
  await TestValidator.error(
    "should reject response reason exceeding maximum length",
    async () => {
      await api.functional.ecommerce.seller.cancellation_requests.responses.putByCancellationrequestidAndResponseid(
        sellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          responseId: initialResponse.id,
          body: {
            response_reason: RandomGenerator.content({
              paragraphs: 5,
              sentenceMin: 10,
              sentenceMax: 15,
            }).substring(0, 600),
          },
        },
      );
    },
  );
  // Test 4: Other seller attempting to modify response
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(otherSeller);
  await TestValidator.error(
    "should prevent other sellers from modifying response",
    async () => {
      await api.functional.ecommerce.seller.cancellation_requests.responses.putByCancellationrequestidAndResponseid(
        otherSellerConnection,
        {
          cancellationRequestId: cancellationRequest.id,
          responseId: initialResponse.id,
          body: {
            response_reason: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 5,
              wordMax: 8,
            }).substring(0, 200),
          },
        },
      );
    },
  );
  // Test 5: Boundary testing - minimum valid length (10 characters)
  const minLengthResponse =
    await api.functional.ecommerce.seller.cancellation_requests.responses.putByCancellationrequestidAndResponseid(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        responseId: initialResponse.id,
        body: {
          response_reason: RandomGenerator.alphabets(10),
        },
      },
    );
  typia.assert(minLengthResponse);
  // Test 6: Boundary testing - maximum valid length (500 characters)
  const maxLengthResponse =
    await api.functional.ecommerce.seller.cancellation_requests.responses.putByCancellationrequestidAndResponseid(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        responseId: initialResponse.id,
        body: {
          response_reason: RandomGenerator.paragraph({
            sentences: 8,
            wordMin: 8,
            wordMax: 12,
          }).substring(0, 500),
        },
      },
    );
  typia.assert(maxLengthResponse);
}
