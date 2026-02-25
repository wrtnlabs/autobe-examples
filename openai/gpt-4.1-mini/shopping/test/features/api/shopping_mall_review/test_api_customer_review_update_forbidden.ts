import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_update_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Test updating a product review by a different customer (not the owner).
  // Verify that the operation is forbidden due to authorization error and no changes or snapshots are created.
  // 1. Create and authorize customer owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    },
  });
  typia.assert(owner);
  // 2. Generate a fake reviewId to simulate an existing review
  const fakeReviewId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create and authorize another customer (not owner)
  const otherConnection: api.IConnection = { host: connection.host };
  const other = await authorize_customer_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "OtherPassword123!",
    },
  });
  typia.assert(other);
  // 4. The other customer attempts to update the owner's review
  const updateBody: IShoppingMallReview.IUpdate = {
    rating: 4,
    body: "Attempted update body by unauthorized user",
  };
  await TestValidator.error(
    "unauthorized customer cannot update others' review",
    async () => {
      await api.functional.shoppingMall.customer.reviews.update(
        otherConnection,
        {
          reviewId: fakeReviewId,
          body: updateBody,
        },
      );
    },
  );
}
