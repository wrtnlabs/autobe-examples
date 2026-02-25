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

/**
 * Test customer cancellation response retrieval workflow.
 * Tests the GET endpoint for retrieving cancellation response records
 * by simulating a scenario where customer retrieves seller's response.
 */
export async function test_api_customer_cancellation_response_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated connections for customer and seller
  const customerConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  // Customer authentication
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  // Seller authentication
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Test the retrieval endpoint with valid UUIDs
  const response =
    await api.functional.ecommerce.customer.cancellation_requests.responses.at(
      customerConnection,
      {
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        responseId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  // Validate the response structure
  typia.assert(response);
  // Validate response fields
  TestValidator.predicate(
    "response has valid ID",
    /^[0-9a-f-]{36}$/i.test(response.id),
  );
  TestValidator.predicate(
    "decision is valid",
    response.decision === "approved" || response.decision === "rejected",
  );
  TestValidator.predicate(
    "response reason is not empty",
    response.response_reason.length >= 10,
  );
  TestValidator.predicate(
    "responded_at is valid date",
    !isNaN(new Date(response.responded_at).getTime()),
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(response.created_at).getTime()),
  );
  // Validate nested relationships
  TestValidator.predicate(
    "cancellation request exists",
    response.cancellationRequest.id.length > 0,
  );
  TestValidator.predicate("seller exists", response.seller.id.length > 0);
  TestValidator.predicate(
    "timestamps are valid sequence",
    new Date(response.created_at) <= new Date(response.responded_at),
  );
}
