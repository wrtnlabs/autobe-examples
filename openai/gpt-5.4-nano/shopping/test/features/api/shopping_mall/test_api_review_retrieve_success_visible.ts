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

export async function test_api_review_retrieve_success_visible(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Authenticate as a member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Retrieve the review twice (read-only)
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  const review1 = await api.functional.shoppingMall.member.reviews.at(
    memberConnection,
    {
      reviewId,
    },
  );
  typia.assert(review1);
  const review2 = await api.functional.shoppingMall.member.reviews.at(
    memberConnection,
    {
      reviewId,
    },
  );
  typia.assert(review2);
  // Business validations (core fields stable)
  TestValidator.equals("review.id matches", review1.id, reviewId);
  TestValidator.equals("review.id stable", review2.id, review1.id);
  TestValidator.equals("review.rating stable", review2.rating, review1.rating);
  TestValidator.equals("review.body stable", review2.body, review1.body);
  TestValidator.equals(
    "review.is_public stable",
    review2.is_public,
    review1.is_public,
  );
  TestValidator.equals(
    "review.deleted_at stable",
    review2.deleted_at,
    review1.deleted_at,
  );
  // Avoid redundant type/format checks after typia.assert
  TestValidator.equals("review.deleted_at is null", review1.deleted_at, null);
}
