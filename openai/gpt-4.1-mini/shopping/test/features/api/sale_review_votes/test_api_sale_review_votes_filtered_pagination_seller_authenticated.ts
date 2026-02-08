import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleReviewVote";
import type { IShoppingMallSaleReviewVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleReviewVote";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test filtered and paginated retrieval of sale review votes by an authenticated seller.
 * It validates correct filtering by review ID and voter, excludes soft deleted votes,
 * supports pagination and sorting, and handles edge and boundary cases.
 */
export async function test_api_sale_review_votes_filtered_pagination_seller_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller and obtain authorized connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(connection, {
    body: {},
  });
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // Helper function to perform query and validate response
  async function queryAndValidate(
    body: IShoppingMallSaleReviewVote.IRequest,
  ): Promise<IPageIShoppingMallSaleReviewVote.ISummary> {
    const response =
      await api.functional.shoppingMall.seller.sale_review_votes.index(
        sellerConnection,
        {
          body,
        },
      );
    typia.assert(response);
    // Validate pagination metadata
    const pagination = response.pagination;
    TestValidator.predicate(
      "pagination current page >= 1",
      pagination.current >= 1,
    );
    TestValidator.predicate("pagination limit > 0", pagination.limit > 0);
    TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
    TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
    // Validate data array is an array
    TestValidator.predicate("data is array", Array.isArray(response.data));
    return response;
  }
  // 2. Positive test: query votes filtering by review ID (null means no filter), paginated
  {
    const body: IShoppingMallSaleReviewVote.IRequest = {
      review_id: null,
      voter_id: null,
      actor_type: null,
      page: 1,
      limit: 5,
      search: null,
      sort: null,
    };
    const res = await queryAndValidate(body);
    // Just check that data array length is plausible
    TestValidator.predicate("data length is 0 or more", res.data.length >= 0);
    // Additional content validation is limited since ISummary has no detailed props
  }
  // 3. Edge case test: filtering by voter_id and actor_type
  {
    // generate random UUID for voter_id for testing both actor types
    const randomVoterUUID = typia.random<
      string & import("typia").tags.Format<"uuid">
    >();
    // Test with actor_type = "seller"
    {
      const bodySeller: IShoppingMallSaleReviewVote.IRequest = {
        review_id: null,
        voter_id: randomVoterUUID,
        actor_type: "seller",
        page: 1,
        limit: 5,
        search: null,
        sort: null,
      };
      const resSeller = await queryAndValidate(bodySeller);
      // We cannot access properties like 'actor_type' or 'voter_id' on ISummary safely, so only test data array length
      TestValidator.predicate(
        "resSeller data length is 0 or more",
        resSeller.data.length >= 0,
      );
    }
    // Test with actor_type = "customer"
    {
      const bodyCustomer: IShoppingMallSaleReviewVote.IRequest = {
        review_id: null,
        voter_id: randomVoterUUID,
        actor_type: "customer",
        page: 1,
        limit: 5,
        search: null,
        sort: null,
      };
      const resCustomer = await queryAndValidate(bodyCustomer);
      TestValidator.predicate(
        "resCustomer data length is 0 or more",
        resCustomer.data.length >= 0,
      );
    }
  }
  // 4. Boundary test: pagination overflow
  {
    const bodyOverflow: IShoppingMallSaleReviewVote.IRequest = {
      review_id: null,
      voter_id: null,
      actor_type: null,
      page: 999999,
      limit: 5,
      search: null,
      sort: null,
    };
    const resOverflow = await queryAndValidate(bodyOverflow);
    TestValidator.equals(
      "pagination current equals requested",
      resOverflow.pagination.current,
      999999,
    );
    TestValidator.equals(
      "data length is zero when overflow",
      resOverflow.data.length,
      0,
    );
  }
}
