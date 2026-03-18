import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_admin_review_get_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor connection: join then login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinBody });
  // Ensure logged-in admin session for subsequent calls
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinBody.email,
      password: adminJoinBody.password,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Member actor connection: join
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberJoinBody });
  // 3) Create a review as member (generator handles delivered order item)
  const createdReview: IShoppingMallReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberConnection,
      {
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          body: typia.random<string | null>(),
          is_public: typia.random<boolean>(),
        } satisfies DeepPartial<IShoppingMallReview.ICreate>,
      },
    );
  typia.assert(createdReview);
  const reviewId = createdReview.id;
  // 4) Call admin endpoint
  const retrieved: IShoppingMallReview =
    await api.functional.shoppingMall.admin.reviews.at(adminConnection, {
      reviewId,
    });
  typia.assert(retrieved);
  // 5) Validate fields
  TestValidator.equals("review id", retrieved.id, reviewId);
  TestValidator.equals("rating", retrieved.rating, createdReview.rating);
  TestValidator.equals("body", retrieved.body, createdReview.body);
  TestValidator.equals(
    "is_public",
    retrieved.is_public,
    createdReview.is_public,
  );
  TestValidator.equals(
    "orderItem",
    retrieved.orderItem,
    createdReview.orderItem,
  );
  TestValidator.equals(
    "created_at",
    retrieved.created_at,
    createdReview.created_at,
  );
  TestValidator.equals(
    "updated_at",
    retrieved.updated_at,
    createdReview.updated_at,
  );
  TestValidator.equals(
    "product.id",
    retrieved.product.id,
    createdReview.product.id,
  );
  // author is an empty summary DTO shape; presence is guaranteed by typia.assert
  TestValidator.equals(
    "author presence",
    Object.keys(retrieved.author).length,
    0,
  );
  // 6) Read-only safety: re-fetch and compare critical fields
  const retrievedAgain: IShoppingMallReview =
    await api.functional.shoppingMall.admin.reviews.at(adminConnection, {
      reviewId,
    });
  typia.assert(retrievedAgain);
  TestValidator.equals(
    "rating stable",
    retrievedAgain.rating,
    retrieved.rating,
  );
  TestValidator.equals("body stable", retrievedAgain.body, retrieved.body);
  TestValidator.equals(
    "is_public stable",
    retrievedAgain.is_public,
    retrieved.is_public,
  );
  TestValidator.equals(
    "created_at stable",
    retrievedAgain.created_at,
    retrieved.created_at,
  );
  TestValidator.equals(
    "updated_at stable",
    retrievedAgain.updated_at,
    retrieved.updated_at,
  );
}
