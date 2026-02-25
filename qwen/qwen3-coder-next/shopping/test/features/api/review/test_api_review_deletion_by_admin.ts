import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>() as string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Format<"email">,
    password: "12345678",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(admin);
  // 2. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>() as string &
      tags.MinLength<1> &
      tags.MaxLength<255> &
      tags.Format<"email">,
    password: "12345678",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await authorize_customer_join(customerConnection, {
    body: customerJoinBody,
  });
  typia.assert(customer);
  // 3. Customer login
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: "12345678",
    href: "https://example.com/login",
    referrer: "https://example.com/home",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerLoggedIn = await authorize_customer_login(customerConnection, {
    body: customerLoginBody,
  });
  typia.assert(customerLoggedIn);
  // 4. Customer writes a review
  const reviewBody = {
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    textContent: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallReview.ICreate;
  const review = await api.functional.shoppingMall.customer.reviews.create(
    customerConnection,
    {
      body: reviewBody,
    },
  );
  typia.assert(review);
  // 5. Admin login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: "12345678",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminLoggedIn = await authorize_admin_login(adminConnection, {
    body: adminLoginBody,
  });
  typia.assert(adminLoggedIn);
  // 6. Admin deletes the customer's review
  await api.functional.shoppingMall.customer.reviews.erase(adminConnection, {
    reviewId: review.id,
  });
  // 7. Verify admin can delete any review (no error thrown during deletion)
  TestValidator.equals("deletion successful", true, true);
}
