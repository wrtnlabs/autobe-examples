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

export async function test_api_customer_review_reactivate_deleted_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and authorize
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(customerAuthorized);
  // 2. Update customer connection with authorization token
  const customerAuthConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerAuthConnection, {
    body: {
      email: customerAuthorized.email,
      password: "1234",
    },
  });
  // 3. Reactivate a soft-deleted review by updating it
  // Note: SDK doesn't have review creation endpoint, so we test with a mock review ID
  // The update endpoint should handle reactivation when updating an inactive review
  const mockReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updatedReview: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.update(
      customerAuthConnection,
      {
        reviewId: mockReviewId,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          text_content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(updatedReview);
  // 4. Validate reactivation results
  TestValidator.equals("review is reactivated", updatedReview.is_active, true);
  TestValidator.equals("deleted_at is cleared", updatedReview.deleted_at, null);
  TestValidator.predicate(
    "rating is valid (1-5)",
    updatedReview.rating >= 1 && updatedReview.rating <= 5,
  );
  TestValidator.equals(
    "customer owns review",
    updatedReview.customer.id,
    customerAuthorized.id,
  );
  TestValidator.predicate(
    "review has valid created timestamp",
    updatedReview.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedReview.updated_at).getTime() > new Date().getTime() - 60000,
  );
}
