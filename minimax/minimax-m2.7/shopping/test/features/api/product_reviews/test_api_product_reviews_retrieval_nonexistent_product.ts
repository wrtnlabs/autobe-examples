import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_reviews_retrieval_nonexistent_product(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Generate a random UUID that does not correspond to any existing product
  const nonExistentProductId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call GET /ecommerceMall/customer/products/{productId}/reviews with non-existent productId
  const reviewsResponse =
    await api.functional.ecommerceMall.customer.products.reviews.at(
      customerConnection,
      {
        productId: nonExistentProductId,
      },
    );
  // 4. Validate response with typia.assert
  typia.assert(reviewsResponse);
  // 5. Validate business logic: empty data array
  TestValidator.equals(
    "data array should be empty",
    reviewsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "data array should be empty array",
    reviewsResponse.data,
    [],
  );
  // 6. Validate pagination structure is valid with total: 0
  TestValidator.equals(
    "pagination records should be 0",
    reviewsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    reviewsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 0",
    reviewsResponse.pagination.current,
    0,
  );
}
