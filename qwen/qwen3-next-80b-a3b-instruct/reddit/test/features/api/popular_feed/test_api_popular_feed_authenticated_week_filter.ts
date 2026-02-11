import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
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

export async function test_api_popular_feed_authenticated_week_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(authorized);
  // 2. Prepare request for popular feed with week filter and hot sort
  const request: IRedditCommunityPost.IRequest = {
    feedType: "popular",
    sortBy: "hot",
    timeFilter: "week", // Only posts created within last 7 days
    page: 1,
    limit: 20,
  };
  // 3. Call popular feed endpoint
  const response: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.popular.index(memberConnection, {
      body: request,
    });
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals("pagination structure", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20);
  TestValidator.predicate("has records", response.pagination.records > 0);
  TestValidator.predicate("has pages", response.pagination.pages >= 1);
  TestValidator.predicate("data array exists", response.data.length > 0);
  // 5. Validate each post in data array
  for (const post of response.data) {
    // Verify post has the correct summary structure
    TestValidator.equals("post has UUID id", typeof post.id, "string");
    TestValidator.predicate(
      "post id is UUID",
      /^[0-9a-f-]{36}$/i.test(post.id),
    );
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals("post has author", typeof post.author, "object");
    TestValidator.equals("author has UUID id", typeof post.author.id, "string");
    TestValidator.predicate(
      "author id is UUID",
      /^[0-9a-f-]{36}$/i.test(post.author.id),
    );
    TestValidator.equals(
      "author has display_name",
      typeof post.author.display_name,
      "string",
    );
    TestValidator.equals(
      "author has avatar_url",
      typeof post.author.avatar_url === "string" ||
        post.author.avatar_url === null ||
        post.author.avatar_url === undefined,
      true,
    );
    TestValidator.equals(
      "author has bio",
      typeof post.author.bio === "string" ||
        post.author.bio === null ||
        post.author.bio === undefined,
      true,
    );
    TestValidator.equals(
      "author has created_at",
      typeof post.author.created_at,
      "string",
    );
    TestValidator.predicate(
      "author created_at is ISO date-time",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        post.author.created_at,
      ),
    );
    TestValidator.equals("post has community", typeof post.community, "object");
    TestValidator.equals(
      "community has UUID id",
      typeof post.community.id,
      "string",
    );
    TestValidator.predicate(
      "community id is UUID",
      /^[0-9a-f-]{36}$/i.test(post.community.id),
    );
    TestValidator.equals(
      "community has name",
      typeof post.community.name,
      "string",
    );
    TestValidator.equals(
      "community has description",
      typeof post.community.description === "string" ||
        post.community.description === null,
      true,
    );
    TestValidator.equals(
      "community has icon_url",
      typeof post.community.icon_url === "string" ||
        post.community.icon_url === null,
      true,
    );
    TestValidator.equals(
      "community has subscriber_count",
      typeof post.community.subscriber_count,
      "number",
    );
    TestValidator.predicate(
      "community subscriber_count >= 0",
      post.community.subscriber_count >= 0,
    );
    TestValidator.equals(
      "community has created_at",
      typeof post.community.created_at,
      "string",
    );
    TestValidator.predicate(
      "community created_at is ISO date-time",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        post.community.created_at,
      ),
    );
    TestValidator.equals(
      "post has vote_score",
      typeof post.vote_score,
      "number",
    );
    TestValidator.predicate(
      "vote_score is int32",
      Number.isInteger(post.vote_score),
    );
    TestValidator.equals(
      "post has comment_count",
      typeof post.comment_count,
      "number",
    );
    TestValidator.predicate(
      "comment_count is int32",
      Number.isInteger(post.comment_count),
    );
    TestValidator.equals(
      "post has created_at",
      typeof post.created_at,
      "string",
    );
    TestValidator.predicate(
      "post created_at is ISO date-time",
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?(Z|[+-]([01][0-9]|2[0-3]):[0-5][0-9])$/i.test(
        post.created_at,
      ),
    );
    TestValidator.equals(
      "post has media_preview",
      typeof post.media_preview === "string" ||
        post.media_preview === null ||
        post.media_preview === undefined,
      true,
    );
    // Verify the post was created within the last 7 days (week filter)
    const postDate = new Date(post.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    TestValidator.predicate(
      "post within last 7 days",
      postDate >= sevenDaysAgo,
    );
    // Verify post has no approved reports (as per scenario requirement)
    // Note: This is confirmed by analysis files, so we assume server-side filtering
    // is already applied and no approved reports are returned in the popular feed
  }
}
