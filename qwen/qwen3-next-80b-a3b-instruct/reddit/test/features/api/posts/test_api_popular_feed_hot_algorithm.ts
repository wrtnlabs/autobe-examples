import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_popular_feed_hot_algorithm(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Step 2: Prepare request body with 'hot' sort and default pagination
  const requestBody = {
    sort: "hot" as const,
    timeRange: null,
    page: 1,
    limit: 20,
  } satisfies ICommunityPlatformPost.IRequest;
  // Step 3: Make the request using member connection
  const response =
    await api.functional.communityPlatform.member.posts.top.index(
      memberConnection,
      { body: requestBody },
    );
  // Step 4: Validate response structure
  typia.assert(response);
  // Step 5: Validate pagination metadata
  TestValidator.equals(
    "pagination should have current page 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should have default limit 20",
    response.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination should have at least 1 record",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have at least 0 pages",
    response.pagination.pages >= 0,
  );
  // Step 6: Validate post summaries
  TestValidator.predicate(
    "should contain at least 1 post",
    response.data.length > 0,
  );
  // Step 7: Validate individual post summary structure
  const firstPost = response.data[0];
  TestValidator.equals(
    "post should have valid UUID id",
    typeof firstPost.id,
    "string",
  );
  TestValidator.equals(
    "author should have empty object structure",
    Object.keys(firstPost.author).length,
    0,
  );
  TestValidator.equals(
    "community should have summary structure",
    Object.keys(firstPost.community).length,
    4,
  );
  TestValidator.equals(
    "community should have name",
    typeof firstPost.community.name,
    "string",
  );
  TestValidator.equals(
    "community should have description",
    typeof firstPost.community.description,
    "string",
  );
  TestValidator.equals(
    "community should have icon",
    typeof firstPost.community.icon,
    "string",
  );
  TestValidator.equals(
    "community should have subscriber count",
    typeof firstPost.community.subscriber_count,
    "number",
  );
  TestValidator.equals(
    "voteScore should be number",
    typeof firstPost.voteScore,
    "number",
  );
  TestValidator.equals(
    "commentCount should be number",
    typeof firstPost.commentCount,
    "number",
  );
  TestValidator.equals(
    "createdAt should be ISO date string",
    typeof firstPost.createdAt,
    "string",
  );
  TestValidator.predicate(
    "createdAt should be valid ISO8601 format",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(
      firstPost.createdAt,
    ),
  );
}
