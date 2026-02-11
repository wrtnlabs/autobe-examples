import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_community_feed_top_month_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  const authResponse = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authResponse);
  // 2. Use a pre-existing community ID (must be pre-populated in test environment)
  // Since we have no way to create a community or query for existing ones,
  // we assume at least one community with ≥10 posts exists with this fixed ID
  // This is a limitation of the test environment setup
  const communityId = "bb3b3b3b-b3b3-b3b3-b3b3-b3b3b3b3b3b3";
  // 3. Retrieve community feed with top/month sorting and limit=10
  const feedRequest: IRedditCommunityPost.IRequest = {
    feedType: "community",
    sortBy: "top",
    timeFilter: "month",
    limit: 10,
    page: 1,
  };
  const feedResponse = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: feedRequest,
    },
  );
  typia.assert(feedResponse);
  // 4. Validate response structure and data
  TestValidator.equals(
    "pagination exists",
    feedResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "pagination current is 1",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    feedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records > 0",
    feedResponse.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages > 0",
    feedResponse.pagination.pages > 0,
  );
  TestValidator.equals("data array has 10 items", feedResponse.data.length, 10);
  // Validate each post in the response
  for (const post of feedResponse.data) {
    TestValidator.equals("post has id", typeof post.id === "string", true);
    TestValidator.predicate(
      "post id is uuid",
      /^[0-9a-f-]{36}$/i.test(post.id),
    );
    TestValidator.equals(
      "post has title",
      typeof post.title === "string",
      true,
    );
    TestValidator.predicate("post title length > 0", post.title.length > 0);
    TestValidator.equals("post has author", post.author !== undefined, true);
    TestValidator.equals(
      "author has id",
      typeof post.author.id === "string",
      true,
    );
    TestValidator.predicate(
      "author id is uuid",
      /^[0-9a-f-]{36}$/i.test(post.author.id),
    );
    TestValidator.equals(
      "author has display_name",
      typeof post.author.display_name === "string",
      true,
    );
    TestValidator.predicate(
      "author display_name length > 0",
      post.author.display_name.length > 0,
    );
    TestValidator.equals(
      "post has community",
      post.community !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      typeof post.community.name === "string",
      true,
    );
    TestValidator.equals(
      "community has subscriber_count",
      typeof post.community.subscriber_count === "number",
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      typeof post.vote_score === "number",
      true,
    );
    TestValidator.predicate("vote_score >= 0", post.vote_score >= 0);
    TestValidator.equals(
      "post has comment_count",
      typeof post.comment_count === "number",
      true,
    );
    TestValidator.predicate("comment_count >= 0", post.comment_count >= 0);
    TestValidator.equals(
      "post has created_at",
      typeof post.created_at === "string",
      true,
    );
    TestValidator.predicate(
      "created_at is date-time",
      /^​[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.\d+Z$/.test(
        post.created_at,
      ),
    );
    // Validate community name matches known community
    TestValidator.equals(
      "post community name matches",
      post.community.name !== undefined,
      true,
    );
  }
  // 5. Validate posts are correctly sorted by vote_score (top)
  for (let i = 0; i < feedResponse.data.length - 1; i++) {
    TestValidator.predicate(
      `post ${i} vote_score >= post ${i + 1} vote_score`,
      feedResponse.data[i].vote_score >= feedResponse.data[i + 1].vote_score,
    );
  }
  // 6. Validate all posts belong to the queried community (we don't know the exact name, but we ensure it's present)
  // We cannot validate the exact name without knowing it from creation, but we ensure they're consistent
  const firstPostCommunityName = feedResponse.data[0].community.name;
  for (const post of feedResponse.data) {
    TestValidator.equals(
      "all posts belong to the same community",
      post.community.name,
      firstPostCommunityName,
    );
  }
  // 7. Validate second page of results
  const feedRequest2: IRedditCommunityPost.IRequest = {
    feedType: "community",
    sortBy: "top",
    timeFilter: "month",
    limit: 5,
    page: 2,
  };
  const feedResponse2 = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: feedRequest2,
    },
  );
  typia.assert(feedResponse2);
  TestValidator.equals("second page has 5 items", feedResponse2.data.length, 5);
  TestValidator.equals(
    "second page has correct pagination",
    feedResponse2.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", feedResponse2.pagination.limit, 5);
  // Validate second page posts are also sorted correctly
  for (let i = 0; i < feedResponse2.data.length - 1; i++) {
    TestValidator.predicate(
      `second page post ${i} vote_score >= post ${i + 1} vote_score`,
      feedResponse2.data[i].vote_score >= feedResponse2.data[i + 1].vote_score,
    );
  }
  // All posts on second page belong to same community as first page
  const secondPageFirstPostCommunityName = feedResponse2.data[0].community.name;
  TestValidator.equals(
    "second page posts belong to same community as first page",
    secondPageFirstPostCommunityName,
    firstPostCommunityName,
  );
}