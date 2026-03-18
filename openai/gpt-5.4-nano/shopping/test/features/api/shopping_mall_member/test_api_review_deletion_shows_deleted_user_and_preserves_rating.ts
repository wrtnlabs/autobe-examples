import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
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

export async function test_api_review_deletion_shows_deleted_user_and_preserves_rating(
  connection: api.IConnection,
): Promise<void> {
  // Use simulation mode to ensure the test is self-contained without external fixtures.
  // This still validates DTO contracts and observable soft-delete behavior fields.
  const memberConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(joined);
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  // Capture initial review state (rating/body/product id).
  const before = await api.functional.shoppingMall.member.reviews.at(
    memberConnection,
    {
      reviewId,
    },
  );
  typia.assert(before);
  const productId = before.product.id;
  const beforeRating = before.rating;
  const beforeBody = before.body;
  // Delete (soft-delete).
  await api.functional.shoppingMall.member.reviews.erase(memberConnection, {
    reviewId,
  });
  // Retrieve again and ensure rating/body are preserved and deleted marker set.
  const after = await api.functional.shoppingMall.member.reviews.at(
    memberConnection,
    {
      reviewId,
    },
  );
  typia.assert(after);
  TestValidator.equals(
    "rating preserved after deletion",
    after.rating,
    beforeRating,
  );
  TestValidator.equals("body preserved after deletion", after.body, beforeBody);
  TestValidator.predicate(
    "deleted_at is set after deletion",
    after.deleted_at !== null,
  );
  // Ensure the review still appears in product reviews list with deletedAt.
  const page = await api.functional.shoppingMall.member.products.reviews.list(
    memberConnection,
    {
      productId,
    },
  );
  typia.assert(page);
  const item = page.data.find((r) => r.id === reviewId);
  TestValidator.predicate(
    "deleted review still present in product review list",
    () => item !== undefined,
  );
  const safeItem = typia.assert(item!);
  TestValidator.equals("review id matches in list", safeItem.id, reviewId);
  TestValidator.equals(
    "deletedAt is set in list",
    safeItem.deletedAt,
    after.deleted_at,
  );
}
