import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verifies the product review summary endpoint returns not-found for missing products.
 *
 * This test confirms that a customer-authenticated request for an unknown product identifier fails before any review aggregation occurs. It validates the endpoint's existence check behavior rather than summary computation, ensuring the missing-product case is handled as a true not-found error.
 *
 * 1. Register a customer account to establish the correct access context.
 * 2. Request the review summary for a deliberately non-existent product identifier.
 * 3. Assert that the endpoint responds with HTTP 404.
 */
export async function test_api_product_review_summary_product_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const missingProductId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" as string & tags.Format<"uuid">;
  await TestValidator.httpError(
    "product review summary should fail for missing product",
    404,
    async () => {
      await api.functional.mallPlatform.customer.products.reviewSummary.at(
        customerConnection,
        {
          productId: missingProductId,
        },
      );
    },
  );
}
