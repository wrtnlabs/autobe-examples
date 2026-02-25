import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_post_vote_listing_with_pagination_and_vote_type_filter(
  connection: api.IConnection,
) {
  // 1. Authenticate a new user for authorization
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Test pagination and voteType filtering
  // Use page size limit = 2 for test purposes
  const limit = 2 as const;
  // Function to query votes by voteType and page
  async function queryVotesPage(voteType: string, page: number) {
    const response =
      await api.functional.communityPlatform.user.postVotes.users.index(
        userConnection,
        {
          body: {
            userId: authorizedUser.id,
            voteType,
            page,
            limit,
          },
        },
      );
    typia.assert(response);
    return response;
  }
  // 3. Query first page of upvotes
  const firstUpvotePage = await queryVotesPage("upvote", 1);
  TestValidator.predicate(
    "first page upvote votes length <= limit",
    firstUpvotePage.data.length <= limit,
  );
  firstUpvotePage.data.forEach((vote) => {
    TestValidator.equals("voteType filter upvote", vote.voteType, "upvote");
    TestValidator.equals(
      "userId matches authorized user",
      vote.userId,
      authorizedUser.id,
    );
  });
  // If no data, next page should be empty or no more records
  if (firstUpvotePage.pagination.pages <= 1) {
    TestValidator.equals(
      "only one page for upvote",
      firstUpvotePage.pagination.pages,
      1,
    );
  } else {
    // 4. Query second page of upvotes if more than one page
    const secondUpvotePage = await queryVotesPage("upvote", 2);
    TestValidator.predicate(
      "second page upvote votes length <= limit",
      secondUpvotePage.data.length <= limit,
    );
    secondUpvotePage.data.forEach((vote) => {
      TestValidator.equals(
        "voteType filter upvote page 2",
        vote.voteType,
        "upvote",
      );
      TestValidator.equals(
        "userId matches authorized user page 2",
        vote.userId,
        authorizedUser.id,
      );
    });
    // 5. Validate that votes in page 2 are distinct from page 1
    const firstPageIds = new Set(firstUpvotePage.data.map((v) => v.id));
    secondUpvotePage.data.forEach((v) => {
      TestValidator.predicate(
        "no duplicate vote IDs across pages",
        !firstPageIds.has(v.id),
      );
    });
  }
  // 6. Query first page of downvotes
  const firstDownvotePage = await queryVotesPage("downvote", 1);
  TestValidator.predicate(
    "first page downvote votes length <= limit",
    firstDownvotePage.data.length <= limit,
  );
  firstDownvotePage.data.forEach((vote) => {
    TestValidator.equals("voteType filter downvote", vote.voteType, "downvote");
    TestValidator.equals(
      "userId matches authorized user downvote",
      vote.userId,
      authorizedUser.id,
    );
  });
  // 7. Authorization error: use unauthorized connection to query votes
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.communityPlatform.user.postVotes.users.index(
      unauthorizedConnection,
      {
        body: {
          userId: authorizedUser.id,
        },
      },
    );
  });
}
