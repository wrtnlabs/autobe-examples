import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_reviews_create } from "../../../generate/generate_random_shopping_mall_member_reviews_create";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";

export async function test_api_review_retrieve_deleted_author_preserves_content(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member (join)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Create a review that will later be deleted.
  // Use generator helper to ensure a valid shopping_mall_order_item_id context.
  const created: IShoppingMallReview =
    await generate_random_shopping_mall_member_reviews_create(
      memberConnection,
      {},
    );
  typia.assert(created);
  const expectedRating = created.rating;
  const expectedBody = created.body;
  // 3) Delete authored review
  await api.functional.shoppingMall.member.reviews.erase(memberConnection, {
    reviewId: created.id,
  });
  // 4) Retrieve again
  const retrieved: IShoppingMallReview =
    await api.functional.shoppingMall.member.reviews.at(memberConnection, {
      reviewId: created.id,
    });
  typia.assert(retrieved);
  // 5) Validate preserved content and deleted-user presentation support
  TestValidator.predicate(
    "deleted_at should be non-null",
    retrieved.deleted_at !== null,
  );
  TestValidator.equals("rating preserved", retrieved.rating, expectedRating);
  TestValidator.equals("body preserved", retrieved.body, expectedBody);
  TestValidator.equals(
    "author summary preserved in retrieval response",
    retrieved.author,
    created.author,
  );
}
