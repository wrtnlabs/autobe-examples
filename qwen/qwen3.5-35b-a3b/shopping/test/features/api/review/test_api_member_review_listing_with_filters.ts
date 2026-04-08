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

export async function test_api_member_review_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  typia.assert(memberAuth.token);
  const memberId: string = memberAuth.id;
  const display_name: string | null = memberAuth.display_name;
  // 2. Create member-specific connection for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: memberAuth.token.access,
    },
  };
  // 3. Test listing reviews with default sorting (created_at desc)
  const defaultListResponse = await api.functional.ecommerceMall.reviews.index(
    authenticatedConnection,
    {
      body: {
        customer_id: memberId,
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(defaultListResponse);
  // 4. Test pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultListResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    defaultListResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination pages calculated",
    defaultListResponse.pagination.pages >= 1,
  );
  // 5. Test filtering by product_id
  const productFilterResponse =
    await api.functional.ecommerceMall.reviews.index(authenticatedConnection, {
      body: {
        customer_id: memberId,
        product_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(productFilterResponse);
  // 6. Test filtering by exact rating
  const ratingFilterResponse = await api.functional.ecommerceMall.reviews.index(
    authenticatedConnection,
    {
      body: {
        customer_id: memberId,
        rating: 5,
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(ratingFilterResponse);
  if (ratingFilterResponse.data.length > 0) {
    TestValidator.predicate(
      "rating filter returns only 5-star reviews",
      ratingFilterResponse.data.every((review) => review.rating === 5),
    );
  }
  // 7. Test filtering by rating range
  const ratingRangeFilterResponse =
    await api.functional.ecommerceMall.reviews.index(authenticatedConnection, {
      body: {
        customer_id: memberId,
        rating_min: 3,
        rating_max: 5,
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(ratingRangeFilterResponse);
  if (ratingRangeFilterResponse.data.length > 0) {
    TestValidator.predicate(
      "rating range filter returns reviews between 3-5",
      ratingRangeFilterResponse.data.every(
        (review) => review.rating >= 3 && review.rating <= 5,
      ),
    );
  }
  // 8. Test sorting by created_at ascending
  const sortCreatedAscResponse =
    await api.functional.ecommerceMall.reviews.index(authenticatedConnection, {
      body: {
        customer_id: memberId,
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(sortCreatedAscResponse);
  // 9. Test sorting by rating descending
  const sortRatingDescResponse =
    await api.functional.ecommerceMall.reviews.index(authenticatedConnection, {
      body: {
        customer_id: memberId,
        sort_by: "rating",
        sort_order: "desc",
        page: 1,
        page_size: 10,
      },
    });
  typia.assert(sortRatingDescResponse);
  // 10. Test sorting by updated_at
  const sortUpdatedResponse = await api.functional.ecommerceMall.reviews.index(
    authenticatedConnection,
    {
      body: {
        customer_id: memberId,
        sort_by: "updated_at",
        sort_order: "desc",
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(sortUpdatedResponse);
  // 11. Test date range filtering
  const createdAfterDate = new Date(Date.now() - 30 * 86400000).toISOString();
  const dateRangeResponse = await api.functional.ecommerceMall.reviews.index(
    authenticatedConnection,
    {
      body: {
        customer_id: memberId,
        created_after: createdAfterDate,
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(dateRangeResponse);
  // 12. Verify response structure contains required fields
  if (defaultListResponse.data.length > 0) {
    const firstReview = defaultListResponse.data[0];
    typia.assert(firstReview);
    TestValidator.equals("review has id", firstReview.id !== undefined, true);
    TestValidator.predicate(
      "review has valid rating (1-5)",
      firstReview.rating >= 1 && firstReview.rating <= 5,
    );
    TestValidator.equals(
      "review member display_name matches",
      firstReview.member.display_name,
      display_name,
    );
    TestValidator.predicate(
      "review has product",
      firstReview.product.id !== undefined &&
        firstReview.product.name !== undefined,
    );
    TestValidator.predicate(
      "review has orderItem",
      firstReview.orderItem.id !== undefined &&
        firstReview.orderItem.order_number !== undefined,
    );
    TestValidator.predicate(
      "review has timestamps",
      firstReview.created_at !== undefined &&
        firstReview.updated_at !== undefined,
    );
  }
  // 13. Test pagination with page 2
  const page2Response = await api.functional.ecommerceMall.reviews.index(
    authenticatedConnection,
    {
      body: {
        customer_id: memberId,
        page: 2,
        page_size: 10,
      },
    },
  );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 pagination current",
    page2Response.pagination.current,
    2,
  );
  // 14. Test with limit parameter
  const limitResponse = await api.functional.ecommerceMall.reviews.index(
    authenticatedConnection,
    {
      body: {
        customer_id: memberId,
        limit: 5,
        page: 1,
        page_size: 5,
      },
    },
  );
  typia.assert(limitResponse);
  TestValidator.equals(
    "limit set correctly",
    limitResponse.pagination.limit,
    5,
  );
}
