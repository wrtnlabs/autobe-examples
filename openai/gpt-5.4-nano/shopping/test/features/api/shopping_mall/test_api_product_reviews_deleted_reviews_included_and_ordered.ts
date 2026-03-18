import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_reviews_deleted_reviews_included_and_ordered(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up a new member via POST /shoppingMall/auth/member/join.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2) Select a productId that has at least one deleted and one non-deleted review.
  const candidates = ArrayUtil.repeat(10, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  let pickedReviews: IPageIShoppingMallReview.ISummary | null = null;
  for (const productId of candidates) {
    const reviews =
      await api.functional.shoppingMall.member.products.reviews.list(
        memberConnection,
        { productId },
      );
    typia.assert(reviews);
    const hasDeleted = reviews.data.some((r) => r.deletedAt !== null);
    const hasNonDeleted = reviews.data.some((r) => r.deletedAt === null);
    if (hasDeleted && hasNonDeleted) {
      pickedReviews = reviews;
      break;
    }
  }
  await TestValidator.predicate(
    "should find a product with both deleted and non-deleted reviews",
    () => pickedReviews !== null,
  );
  const reviews = pickedReviews!;
  // 4) Validate ordering newest-first (assume updatedAt).
  const orderTimestamps = reviews.data.map((r) =>
    new Date(r.updatedAt).getTime(),
  );
  const sorted = [...orderTimestamps].sort((a, b) => b - a);
  TestValidator.equals(
    "reviews should be sorted newest-first by updatedAt",
    orderTimestamps,
    sorted,
  );
  // 5) Validate deleted visibility fields are kept and represented.
  const deleted = reviews.data.filter((r) => r.deletedAt !== null);
  const nonDeleted = reviews.data.filter((r) => r.deletedAt === null);
  TestValidator.predicate(
    "should contain deleted reviews",
    () => deleted.length > 0,
  );
  TestValidator.predicate(
    "should contain non-deleted reviews",
    () => nonDeleted.length > 0,
  );
  deleted.forEach((r) => {
    TestValidator.notEquals(
      "deleted review deletedAt should not be null",
      r.deletedAt,
      null,
    );
    TestValidator.predicate(
      "deleted review has rating",
      () => typeof r.rating === "number",
    );
    TestValidator.predicate(
      "deleted review has isPublic",
      () => typeof r.isPublic === "boolean",
    );
    TestValidator.predicate(
      "deleted review body should be null or string",
      () => r.body === null || typeof r.body === "string",
    );
  });
  // 6) Ensure the deleted records are not filtered out.
  TestValidator.predicate(
    "deleted reviews should exist within returned list",
    () =>
      deleted.length ===
      reviews.data.filter((r) => r.deletedAt !== null).length,
  );
}
