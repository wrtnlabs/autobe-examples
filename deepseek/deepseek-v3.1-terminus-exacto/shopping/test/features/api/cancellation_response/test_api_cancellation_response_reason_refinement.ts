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

export async function test_api_cancellation_response_reason_refinement(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create seller connection and join
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
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Create a cancellation request
  const cancellationRequest =
    await api.functional.ecommerce.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }) satisfies string &
            tags.MinLength<10> &
            tags.MaxLength<500>,
        } satisfies IEcommerceCancellationRequest.ICreate,
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
          decision: "approved" as const,
          response_reason: RandomGenerator.paragraph({
            sentences: 1,
          }) satisfies string & tags.MinLength<10> & tags.MaxLength<500>,
        } satisfies IEcommerceCancellationResponseRecord.ICreate,
      },
    );
  typia.assert(initialResponse);
  // Store original values
  const originalDecision = initialResponse.decision;
  const originalRespondedAt = initialResponse.responded_at;
  const originalCancellationRequestId = initialResponse.cancellationRequest.id;
  // Update the response reason
  const updatedResponse =
    await api.functional.ecommerce.seller.cancellation_requests.responses.putByCancellationrequestidAndResponseid(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        responseId: initialResponse.id,
        body: {
          response_reason:
            "Updated response reason with more detailed explanation" satisfies string & tags.MinLength<10> & tags.MaxLength<500>,
        } satisfies IEcommerceCancellationResponseRecord.IUpdate,
      },
    );
  typia.assert(updatedResponse);
  // Validate that only response_reason changed
  TestValidator.notEquals(
    "response reason should be updated",
    initialResponse.response_reason,
    updatedResponse.response_reason,
  );
  // Validate that immutable fields remain unchanged
  TestValidator.equals(
    "decision should remain unchanged",
    updatedResponse.decision,
    originalDecision,
  );
  TestValidator.equals(
    "responded_at should remain unchanged",
    updatedResponse.responded_at,
    originalRespondedAt,
  );
  TestValidator.equals(
    "cancellation request ID should remain unchanged",
    updatedResponse.cancellationRequest.id,
    originalCancellationRequestId,
  );
  // Test that the response belongs to the correct seller
  TestValidator.equals(
    "seller ID should match authenticated seller",
    updatedResponse.seller.id,
    seller.id,
  );
}