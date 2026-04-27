import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_retrieval_active_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Retrieve a review by its unique identifier
  const review = await api.functional.eCommerceMall.customer.reviews.at(
    customerConnection,
    {
      reviewId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(review);
  // 3. Validate key properties
  TestValidator.predicate(
    "rating is between 1 and 5",
    review.rating >= 1 && review.rating <= 5,
  );
  TestValidator.predicate(
    "customer display name is not 'deleted user'",
    review.customer.profile?.display_name !== "deleted user",
  );
  TestValidator.equals("deleted_at is null", review.deleted_at, null);
  TestValidator.predicate("has valid created_at", !!review.created_at);
  TestValidator.predicate("has valid updated_at", !!review.updated_at);
  TestValidator.predicate("has product id", !!review.product.id);
  TestValidator.predicate("has product name", !!review.product.name);
  TestValidator.predicate("has order reference", !!review.order.id);
  TestValidator.predicate("has orderItem reference", !!review.orderItem.id);
}
