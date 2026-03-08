import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_update_partial_rating_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customerAuthorized);
  // Create connection with customer token for subsequent API calls
  const customerTokenConnection: api.IConnection = { host: connection.host };
  customerTokenConnection.headers = {
    ...customerTokenConnection.headers,
    Authorization: customerAuthorized.token.access,
  };
  // 2. Generate a valid review ID (simulating existing review)
  // Since create review endpoint is not available, we assume a review exists
  const reviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First update: Create initial review state with 4 stars and text content
  const initialRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 4;
  const initialText: string = RandomGenerator.paragraph({ sentences: 3 });
  const initialReview: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerTokenConnection,
      {
        reviewId,
        body: {
          rating: initialRating,
          text_content: initialText,
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(initialReview);
  // Validate initial review state
  TestValidator.equals("initial rating", initialReview.rating, initialRating);
  TestValidator.equals(
    "initial text content",
    initialReview.text_content,
    initialText,
  );
  TestValidator.equals("initial is active", initialReview.is_active, true);
  // 4. Second update: Change only rating to 2 stars, keeping text unchanged
  const updatedRating: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<5> = 2;
  const updatedReview: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerTokenConnection,
      {
        reviewId,
        body: {
          rating: updatedRating,
          // text_content NOT included - partial update test
        } satisfies IEcommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 5. Validate partial update results
  TestValidator.equals(
    "updated rating changed to 2",
    updatedReview.rating,
    updatedRating,
  );
  TestValidator.equals(
    "text content preserved from initial state",
    updatedReview.text_content,
    initialText,
  );
  TestValidator.notEquals(
    "rating changed from 4 to 2",
    initialReview.rating,
    updatedReview.rating,
  );
  TestValidator.equals(
    "review remains active after update",
    updatedReview.is_active,
    true,
  );
}
