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

export async function test_api_cancellation_response_retrieve_approved_details(
  connection: api.IConnection,
): Promise<void> {
  // Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerce.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_url: typia.random<string & tags.Format<"uri">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(sellerAuth);
  // Create customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await api.functional.ecommerce.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      },
    },
  );
  typia.assert(customerAuth);
  // Create cancellation request (unit tests handle product/order creation dependencies)
  const cancellationRequest =
    await api.functional.ecommerce.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          ecommerce_order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }).substring(10, 110),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Seller creates approval response
  const approvalReason = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  }).substring(10, 150);
  const response =
    await api.functional.ecommerce.seller.cancellation_requests.responses.create(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          decision: "approved",
          response_reason: approvalReason,
        },
      },
    );
  typia.assert(response);
  // Seller retrieves the response record
  const retrieved =
    await api.functional.ecommerce.seller.cancellation_requests.responses.at(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        responseId: response.id,
      },
    );
  typia.assert(retrieved);
  // Validate the retrieved response
  TestValidator.equals("response ID matches", retrieved.id, response.id);
  TestValidator.equals("decision is approved", retrieved.decision, "approved");
  TestValidator.equals(
    "response reason matches",
    retrieved.response_reason,
    approvalReason,
  );
  TestValidator.predicate(
    "has responded_at timestamp",
    retrieved.responded_at !== undefined,
  );
  TestValidator.predicate(
    "has created_at timestamp",
    retrieved.created_at !== undefined,
  );
  // Validate cancellation request relationship
  TestValidator.equals(
    "cancellation request ID matches",
    retrieved.cancellationRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals(
    "cancellation request reason matches",
    retrieved.cancellationRequest.reason,
    cancellationRequest.reason,
  );
  // Validate seller relationship (authorization check)
  TestValidator.equals("seller ID matches", retrieved.seller.id, sellerAuth.id);
  TestValidator.equals(
    "seller email matches",
    retrieved.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "shop name matches",
    retrieved.seller.shop_name,
    sellerAuth.shop_name,
  );
}
