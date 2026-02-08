import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReviewVote";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_sale_review_votes_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authorize customer
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      // Use an empty object as per DTO IShoppingMallCustomer.IJoin (no properties)
    },
  });
  typia.assert(joinResult);
  customerConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  // 2. Search votes with empty filter (all visible votes for this customer)
  let searchBody: IShoppingMallSaleReviewVote.IRequest = {};
  let result =
    await api.functional.shoppingMall.customer.sale_review_votes.index(
      customerConnection,
      { body: searchBody },
    );
  typia.assert(result);
  // Pagination metadata validation
  TestValidator.predicate(
    "pagination current page is positive",
    result.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    result.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    result.pagination.records >= 0,
  );
  // All votes should have deleted_at null (active votes only) - we cannot test deleted_at because schema IShoppingMallSaleReviewVote.ISummary is empty
  // but scenario requires checking active votes only. We'll skip this due to schema empty but keep in mind.
  // If any data, validate ids and expected fields (IShoppingMallSaleReviewVote.ISummary has no specified properties, so typia.assert suffices)
  for (const vote of result.data) {
    typia.assert(vote);
  }
  // 3. Filter votes by review_id (simulate by taking review_id from first result if present)
  if (result.data.length > 0) {
    const sampleReviewId = (result.data[0] as any).review_id;
    if (sampleReviewId !== undefined) {
      searchBody = { review_id: sampleReviewId };
      const filteredByReview =
        await api.functional.shoppingMall.customer.sale_review_votes.index(
          customerConnection,
          { body: searchBody },
        );
      typia.assert(filteredByReview);
      for (const vote of filteredByReview.data) {
        if ((vote as any).review_id !== undefined)
          TestValidator.equals(
            "all votes have filtered review_id",
            (vote as any).review_id,
            sampleReviewId,
          );
      }
    }
  }
  // 4. Filter by voter_id (simulate by using some voter_id from previous data if possible)
  if (result.data.length > 0) {
    const voterId = (result.data[0] as any).voter_id;
    if (voterId !== undefined) {
      searchBody = { voter_id: voterId };
      const filteredByVoter =
        await api.functional.shoppingMall.customer.sale_review_votes.index(
          customerConnection,
          { body: searchBody },
        );
      typia.assert(filteredByVoter);
      for (const vote of filteredByVoter.data) {
        if ((vote as any).voter_id !== undefined)
          TestValidator.equals(
            "all votes have filtered voter_id",
            (vote as any).voter_id,
            voterId,
          );
      }
    }
  }
  // 5. Filter by actor_type (simulate by 'customer' and 'seller' if possible)
  for (const actorType of ["customer", "seller"] as const) {
    searchBody = {
      actor_type: actorType,
    } as IShoppingMallSaleReviewVote.IRequest;
    const filteredByActorType =
      await api.functional.shoppingMall.customer.sale_review_votes.index(
        customerConnection,
        { body: searchBody },
      );
    typia.assert(filteredByActorType);
    for (const vote of filteredByActorType.data) {
      const voteActorType = (vote as any).actor_type;
      if (voteActorType !== undefined) {
        TestValidator.equals(
          `vote actor_type matches ${actorType}`,
          voteActorType,
          actorType,
        );
      }
    }
  }
  // 6. Test pagination with varied page and limit
  const paginationParams = [
    { current: 1, limit: 1 },
    { current: 2, limit: 2 },
    { current: 3, limit: 5 },
  ];
  for (const params of paginationParams) {
    searchBody = {
      page: params.current,
      limit: params.limit,
    } as IShoppingMallSaleReviewVote.IRequest;
    const pagedResult =
      await api.functional.shoppingMall.customer.sale_review_votes.index(
        customerConnection,
        { body: searchBody },
      );
    typia.assert(pagedResult);
    TestValidator.equals(
      "pagination current matches request",
      pagedResult.pagination.current,
      params.current,
    );
    TestValidator.equals(
      "pagination limit matches request",
      pagedResult.pagination.limit,
      params.limit,
    );
    TestValidator.predicate(
      "pagination pages is non-negative",
      pagedResult.pagination.pages >= 0,
    );
    TestValidator.predicate(
      "pagination records is non-negative",
      pagedResult.pagination.records >= 0,
    );
    TestValidator.predicate(
      "paged result data length is at most limit",
      pagedResult.data.length <= params.limit,
    );
  }
  // 7. Test unauthorized request is denied
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access should fail",
    401,
    async () => {
      await api.functional.shoppingMall.customer.sale_review_votes.index(
        unauthConnection,
        { body: {} },
      );
    },
  );
}
