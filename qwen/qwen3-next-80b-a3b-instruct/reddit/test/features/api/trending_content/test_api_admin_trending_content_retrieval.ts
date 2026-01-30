import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsTrendingContent";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsTrendingContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsTrendingContent";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_trending_content_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Use the admin-specific connection to retrieve trending content
  const trendingData: IPageICommunityBbsTrendingContent =
    await api.functional.communityBbs.admin.analytics.posts.trending.index(
      adminConnection,
    );
  typia.assert(trendingData);
  // Step 3: Validate pagination structure
  TestValidator.equals(
    "pagination current is a positive integer",
    trendingData.pagination.current,
    trendingData.pagination.current,
  );
  TestValidator.predicate(
    "pagination current is at least 1",
    trendingData.pagination.current >= 1,
  );
  TestValidator.equals(
    "pagination limit is a positive integer",
    trendingData.pagination.limit,
    trendingData.pagination.limit,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    trendingData.pagination.limit >= 1,
  );
  TestValidator.equals(
    "pagination records is a non-negative integer",
    trendingData.pagination.records,
    trendingData.pagination.records,
  );
  TestValidator.predicate(
    "pagination records is not negative",
    trendingData.pagination.records >= 0,
  );
  TestValidator.equals(
    "pagination pages is a non-negative integer",
    trendingData.pagination.pages,
    trendingData.pagination.pages,
  );
  TestValidator.predicate(
    "pagination pages is not negative",
    trendingData.pagination.pages >= 0,
  );
  // Step 4: Validate trending content items
  TestValidator.predicate(
    "data array is not empty",
    trendingData.data.length > 0,
  );
  // Step 5: Validate at least one trending content item
  const firstItem = trendingData.data[0];
  TestValidator.equals(
    "post_id format is uuid",
    firstItem.post_id,
    firstItem.post_id,
  );
  TestValidator.predicate(
    "post_id is a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstItem.post_id,
    ),
  );
  TestValidator.predicate(
    "trending_score is a number",
    typeof firstItem.trending_score === "number",
  );
  TestValidator.equals(
    "published_at format is date-time",
    firstItem.published_at,
    firstItem.published_at,
  );
  TestValidator.predicate(
    "published_at is valid date-time format",
    !isNaN(Date.parse(firstItem.published_at)),
  );
  TestValidator.equals(
    "community_id format is uuid",
    firstItem.community_id,
    firstItem.community_id,
  );
  TestValidator.predicate(
    "community_id is a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstItem.community_id,
    ),
  );
  TestValidator.predicate(
    "post_title is a string",
    typeof firstItem.post_title === "string",
  );
  TestValidator.equals(
    "author_id format is uuid",
    firstItem.author_id,
    firstItem.author_id,
  );
  TestValidator.predicate(
    "author_id is a valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstItem.author_id,
    ),
  );
  TestValidator.predicate(
    "author_handle is a string",
    typeof firstItem.author_handle === "string",
  );
  TestValidator.predicate(
    "total_upvotes is a non-negative integer",
    Number.isInteger(firstItem.total_upvotes) && firstItem.total_upvotes >= 0,
  );
  TestValidator.predicate(
    "total_downvotes is a non-negative integer",
    Number.isInteger(firstItem.total_downvotes) &&
      firstItem.total_downvotes >= 0,
  );
  TestValidator.predicate(
    "total_comments is a non-negative integer",
    Number.isInteger(firstItem.total_comments) && firstItem.total_comments >= 0,
  );
  TestValidator.predicate(
    "comment_engagement_score is a number",
    typeof firstItem.comment_engagement_score === "number",
  );
  TestValidator.predicate(
    "recency_weight is a number",
    typeof firstItem.recency_weight === "number",
  );
  TestValidator.predicate(
    "engagement_velocity is a number",
    typeof firstItem.engagement_velocity === "number",
  );
  TestValidator.predicate(
    "author_karma_score is a number",
    typeof firstItem.author_karma_score === "number",
  );
}
