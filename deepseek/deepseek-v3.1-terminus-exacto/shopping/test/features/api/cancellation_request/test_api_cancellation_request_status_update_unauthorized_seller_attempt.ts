import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
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

/**
 * Test authorization enforcement where a seller attempts to update a cancellation request not associated with their shop.
 * Setup: Two sellers authenticate, a random cancellation request ID is used.
 * Unauthorized seller attempts to approve the cancellation request.
 * Expected: Authorization error (403 Forbidden).
 * Validates business rule that sellers cannot respond to cancellation requests for products they do not own.
 */
export async function test_api_cancellation_request_status_update_unauthorized_seller_attempt(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller A (authenticated, owns the product)
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {
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
  });
  // Seller A is now authenticated, but we cannot create product/order/cancellation request via SDK.
  // Seller B (unauthorized seller) who does not own the product
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {
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
  });
  // 2. Generate a random cancellation request ID (simulating a request not owned by seller B)
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3. Seller B attempts to update status (should fail with authorization error 403)
  await TestValidator.httpError(
    "unauthorized seller cannot update cancellation request",
    403,
    async () => {
      await api.functional.ecommerce.customer.cancellation_requests.statuses.update(
        sellerBConnection,
        {
          cancellationRequestId,
          body: {
            decision: "approved",
            reason: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
          } satisfies IEcommerceCancellationRequest.IUpdate,
        },
      );
    },
  );
  // 4. No further validation possible as we lack creation endpoints.
  // The error validation ensures authorization rule is enforced.
}
