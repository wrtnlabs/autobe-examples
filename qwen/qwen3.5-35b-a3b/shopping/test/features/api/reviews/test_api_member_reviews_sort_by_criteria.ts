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

export async function test_api_member_reviews_sort_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create member connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member.access}` },
  };
  // 3. Get reviews with default sorting (created_at desc)
  const defaultReviews =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 100,
        },
      },
    );
  typia.assert(defaultReviews);
  // 4. Test sorting by created_at desc (newest first)
  const reviewsByDateDesc =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 100,
          sort_by: "created_at",
          sort_order: "desc",
        },
      },
    );
  typia.assert(reviewsByDateDesc);
  // 5. Test sorting by created_at asc (oldest first)
  const reviewsByDateAsc =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 100,
          sort_by: "created_at",
          sort_order: "asc",
        },
      },
    );
  typia.assert(reviewsByDateAsc);
  // 6. Test sorting by rating desc (highest rated first)
  const reviewsByRatingDesc =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 100,
          sort_by: "rating",
          sort_order: "desc",
        },
      },
    );
  typia.assert(reviewsByRatingDesc);
  // 7. Test sorting by rating asc (lowest rated first)
  const reviewsByRatingAsc =
    await api.functional.ecommerceMall.member.member.reviews.index(
      memberConnection,
      {
        body: {
          page: 1,
          page_size: 100,
          sort_by: "rating",
          sort_order: "asc",
        },
      },
    );
  typia.assert(reviewsByRatingAsc);
  // 8. Verify pagination metadata is consistent across all sorts
  TestValidator.equals(
    "pagination consistency - default",
    defaultReviews.pagination,
    reviewsByDateDesc.pagination,
  );
  TestValidator.equals(
    "pagination consistency - date asc",
    reviewsByDateDesc.pagination,
    reviewsByDateAsc.pagination,
  );
  TestValidator.equals(
    "pagination consistency - rating desc",
    reviewsByDateDesc.pagination,
    reviewsByRatingDesc.pagination,
  );
  TestValidator.equals(
    "pagination consistency - rating asc",
    reviewsByDateDesc.pagination,
    reviewsByRatingAsc.pagination,
  );
  // 9. Verify all review summaries include full product information
  if (defaultReviews.data.length > 0) {
    const sampleReview = defaultReviews.data[0];
    TestValidator.notEquals(
      "review has product info",
      sampleReview.product,
      undefined,
    );
    TestValidator.notEquals(
      "product has id",
      sampleReview.product.id,
      undefined,
    );
    TestValidator.notEquals(
      "product has name",
      sampleReview.product.name,
      undefined,
    );
    TestValidator.notEquals(
      "product has category",
      sampleReview.product.category,
      undefined,
    );
    TestValidator.notEquals(
      "product has seller",
      sampleReview.product.seller,
      undefined,
    );
    TestValidator.notEquals(
      "review has member info",
      sampleReview.member,
      undefined,
    );
    TestValidator.notEquals(
      "review has orderItem",
      sampleReview.orderItem,
      undefined,
    );
  }
  // 10. Validate sort order for reviewsByDateDesc (newest first)
  if (reviewsByDateDesc.data.length > 1) {
    let sortedCorrectly = true;
    for (let i = 0; i < reviewsByDateDesc.data.length - 1; i++) {
      const current = new Date(reviewsByDateDesc.data[i].created_at);
      const next = new Date(reviewsByDateDesc.data[i + 1].created_at);
      if (current < next) {
        sortedCorrectly = false;
        break;
      }
    }
    TestValidator.predicate(
      "reviews sorted by created_at desc",
      sortedCorrectly,
    );
  }
  // 11. Validate sort order for reviewsByDateAsc (oldest first)
  if (reviewsByDateAsc.data.length > 1) {
    let sortedCorrectly = true;
    for (let i = 0; i < reviewsByDateAsc.data.length - 1; i++) {
      const current = new Date(reviewsByDateAsc.data[i].created_at);
      const next = new Date(reviewsByDateAsc.data[i + 1].created_at);
      if (current > next) {
        sortedCorrectly = false;
        break;
      }
    }
    TestValidator.predicate(
      "reviews sorted by created_at asc",
      sortedCorrectly,
    );
  }
  // 12. Validate sort order for reviewsByRatingDesc (highest first)
  if (reviewsByRatingDesc.data.length > 1) {
    let sortedCorrectly = true;
    for (let i = 0; i < reviewsByRatingDesc.data.length - 1; i++) {
      const current = reviewsByRatingDesc.data[i].rating;
      const next = reviewsByRatingDesc.data[i + 1].rating;
      if (current < next) {
        sortedCorrectly = false;
        break;
      }
    }
    TestValidator.predicate("reviews sorted by rating desc", sortedCorrectly);
  }
  // 13. Validate sort order for reviewsByRatingAsc (lowest first)
  if (reviewsByRatingAsc.data.length > 1) {
    let sortedCorrectly = true;
    for (let i = 0; i < reviewsByRatingAsc.data.length - 1; i++) {
      const current = reviewsByRatingAsc.data[i].rating;
      const next = reviewsByRatingAsc.data[i + 1].rating;
      if (current > next) {
        sortedCorrectly = false;
        break;
      }
    }
    TestValidator.predicate("reviews sorted by rating asc", sortedCorrectly);
  }
}