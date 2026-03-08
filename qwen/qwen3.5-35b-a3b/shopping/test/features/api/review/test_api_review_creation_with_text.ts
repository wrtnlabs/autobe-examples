import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_review_creation_with_text(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // 2. Update customer profile with display name
  const customerProfileConnection: api.IConnection = {
    host: connection.host,
  };
  customerProfileConnection.headers = {
    ...customerProfileConnection.headers,
    Authorization: customerAuthorized.token.access,
  };
  const display_name = RandomGenerator.name();
  const customerProfile =
    await api.functional.ecommerceMall.customer.profile.update(
      customerProfileConnection,
      {
        body: {
          displayName: display_name,
        } satisfies IEcommerceMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(customerProfile);
  // 3. Generate random product_id for review
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create review body
  const reviewBody = {
    product_id: productId,
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    text_content: RandomGenerator.paragraph({
      sentences: 5,
      wordMin: 5,
      wordMax: 15,
    }).substring(0, 2000),
  } satisfies IEcommerceMallReview.ICreate;
  // 5. Create review
  const review = await api.functional.ecommerceMall.customer.reviews.create(
    customerConnection,
    { body: reviewBody },
  );
  typia.assert(review);
  // 6. Validate review creation - rating matches
  TestValidator.equals(
    "review rating matches input",
    review.rating,
    reviewBody.rating,
  );
  // 7. Validate review creation - text content preserved
  if (reviewBody.text_content !== undefined) {
    TestValidator.equals(
      "text content preserved",
      review.text_content,
      reviewBody.text_content,
    );
  }
  // 8. Verify customer display name in review (not email)
  TestValidator.equals(
    "review customer display name matches profile",
    review.customer.customerProfile.displayName,
    customerProfile.displayName satisfies string as string,
  );
  // 9. Verify review appears in product review list sorted by newest
  const reviewList = await api.functional.ecommerceMall.products.reviews.index(
    connection,
    {
      productId,
      body: {
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceMallReview.IRequest,
    },
  );
  typia.assert(reviewList);
  TestValidator.predicate(
    "review list contains created review",
    reviewList.data.some((r) => r.id === review.id),
  );
  // Verify sorting - newest review should be first if review exists in list
  if (reviewList.data.length > 0) {
    const firstReview = reviewList.data[0];
    TestValidator.equals(
      "review is first in newest-first sorted list",
      firstReview.id,
      review.id,
    );
  }
}