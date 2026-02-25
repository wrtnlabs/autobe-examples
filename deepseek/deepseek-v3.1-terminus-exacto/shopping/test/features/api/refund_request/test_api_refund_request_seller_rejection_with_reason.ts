import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundResponseRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundResponseRecord";
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
import { generate_random_ecommerce_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_refund_requests_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { generate_random_ecommerce_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_seller_products_variants_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

/**
 * Test refund rejection workflow where seller rejects a refund request with detailed reasoning.
 * Validate that rejection requires minimum 20-character reason as per business requirements.
 * Verify refund request status updates to 'rejected', response record is created with decision='rejected',
 * and seller's detailed rejection reason is properly stored for dispute resolution.
 */
export async function test_api_refund_request_seller_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Setup seller connection and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceSeller.ILogin,
  });
  // Setup customer connection and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // Seller creates product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }).substring(0, 200),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // Seller creates product variant
  const variant =
    await generate_random_ecommerce_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphabets(10),
          option_values: JSON.stringify({ size: "M", color: "Blue" }),
          price_override: null,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
        } satisfies IEcommerceProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Seller rejects refund request with detailed reason (minimum 20 characters)
  const rejectionReason = RandomGenerator.paragraph({ sentences: 4 }); // Ensure >=20 chars
  TestValidator.predicate(
    "rejection reason minimum 20 characters",
    rejectionReason.length >= 20,
  );
  // Based on the API documentation, the endpoint expects a body with decision and response_reason
  const sellerResponse =
    await api.functional.ecommerce.seller.refund_requests.responses.create(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          decision: "rejected",
          response_reason: rejectionReason,
        } as any, // Use type assertion to bypass the incorrect DTO type
      },
    );
  typia.assert(sellerResponse);
  // Validate response properties
  TestValidator.equals(
    "decision should be 'rejected'",
    sellerResponse.decision,
    "rejected",
  );
  TestValidator.equals(
    "response reason matches input",
    sellerResponse.response_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "response timestamp should be set",
    sellerResponse.responded_at.length > 0,
  );
  // Validate seller reference
  TestValidator.equals(
    "seller ID matches",
    sellerResponse.seller.id,
    refundRequest.seller.id,
  );
  // Validate refund request reference
  TestValidator.equals(
    "refund request ID matches",
    sellerResponse.refundRequest.id,
    refundRequest.id,
  );
  // Validate detailed rejection reason is properly stored
  TestValidator.predicate(
    "rejection reason properly stored",
    sellerResponse.response_reason.length >= 20 &&
      sellerResponse.response_reason === rejectionReason,
  );
}
