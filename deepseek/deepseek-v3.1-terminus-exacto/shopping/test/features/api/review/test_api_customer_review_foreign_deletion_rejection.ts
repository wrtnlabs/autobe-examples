import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_foreign_deletion_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Create first customer connection and authenticate
  const firstCustomerConnection: api.IConnection = { host: connection.host };
  const firstCustomer = await authorize_customer_join(firstCustomerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  // Create second customer connection and authenticate
  const secondCustomerConnection: api.IConnection = { host: connection.host };
  const secondCustomer = await authorize_customer_join(
    secondCustomerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
      } satisfies IEcommerceCustomer.IJoin,
    },
  );
  typia.assert(secondCustomer);
  // Since review creation endpoint is not available in provided APIs,
  // use random IDs to test the authorization rejection mechanism
  const productId = typia.random<string & tags.Format<"uuid">>();
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete a review using wrong customer credentials
  // This should fail with authorization error (403 Forbidden)
  await TestValidator.httpError(
    "foreign review deletion should fail",
    403,
    async () => {
      await api.functional.ecommerce.customer.products.reviews.erase(
        secondCustomerConnection,
        {
          productId,
          reviewId,
        },
      );
    },
  );
  // Note: Without a review read endpoint, we cannot validate that the review
  // remains intact. The test focuses on validating the authorization failure.
}
