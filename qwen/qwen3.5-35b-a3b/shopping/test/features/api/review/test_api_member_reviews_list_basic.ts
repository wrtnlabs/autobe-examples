import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_reviews_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account via auth join
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallMember.IJoin;
  const memberAuth = await api.functional.ecommerceMall.auth.member.join(
    memberConnection,
    { body: joinInput },
  );
  typia.assert(memberAuth);
  // Step 2: Call reviews index endpoint with pagination
  const reviewsPage =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 5,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(reviewsPage);
  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    reviewsPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", reviewsPage.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records non-negative",
    reviewsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    reviewsPage.pagination.pages >= 0,
  );
  // Step 4: Validate review summaries
  for (const review of reviewsPage.data) {
    typia.assert(review);
    // Validate review ID is valid UUID (typia.assert already validates format)
    TestValidator.predicate("review id is valid uuid", review.id !== undefined);
    // Validate rating is between 1-5 (typia.assert already validates constraints)
    TestValidator.equals(
      "rating between 1-5",
      review.rating >= 1 && review.rating <= 5,
      true,
    );
    // Validate member reference exists
    TestValidator.predicate(
      "member reference present",
      review.member.id !== undefined,
    );
    TestValidator.predicate(
      "member email present",
      review.member.email !== undefined,
    );
    TestValidator.predicate(
      "member display_name present",
      review.member.display_name !== undefined,
    );
    // Validate product reference exists
    TestValidator.predicate(
      "product reference present",
      review.product.id !== undefined,
    );
    TestValidator.predicate(
      "product name present",
      review.product.name !== undefined,
    );
    TestValidator.predicate(
      "product base_price present",
      typeof review.product.base_price === "number",
    );
    // Validate orderItem reference exists
    TestValidator.predicate(
      "orderItem reference present",
      review.orderItem.id !== undefined,
    );
    TestValidator.predicate(
      "orderItem quantity present",
      review.orderItem.quantity !== undefined,
    );
    // Validate deleted_at is NULL for all reviews
    TestValidator.equals("deleted_at is null", review.deleted_at, null);
  }
}
