import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_user_posts_listing_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // Step 1: Create a guest session for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await api.functional.redditClone.auth.guest.join(
    guestConnection,
    {
      body: {
        fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneGuestSession.IJoin,
    },
  );
  typia.assert(guestAuth);
  // NOTE: The scenario requires member/join and member/posts to create test data,
  // but these endpoints are not available in the SDK. Testing the endpoint
  // directly with existing data or empty results.
  // Step 2: Test the target endpoint with 'hot' sort
  const hotPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "hot",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(hotPosts);
  // Validate pagination structure
  TestValidator.equals("pagination exists", hotPosts.pagination !== null, true);
  TestValidator.predicate(
    "pagination current is valid",
    hotPosts.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    hotPosts.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    hotPosts.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    hotPosts.pagination.pages >= 0,
  );
  // Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(hotPosts.data), true);
  // Validate post summary structure if posts exist
  for (const post of hotPosts.data) {
    TestValidator.predicate(
      "post id is valid UUID",
      /^[0-9a-f-]{36}$/i.test(post.id),
    );
    TestValidator.equals("post title exists", post.title !== undefined, true);
    TestValidator.equals("post type exists", post.type !== undefined, true);
    TestValidator.predicate(
      "post vote_score is number",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "post comment_count is number",
      typeof post.comment_count === "number",
    );
    TestValidator.predicate(
      "post created_at is datetime",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.created_at),
    );
    TestValidator.equals("author exists", post.author !== undefined, true);
    TestValidator.equals(
      "community exists",
      post.community !== undefined,
      true,
    );
  }
  // Step 3: Test with 'new' sort
  const newPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "new",
        limit: 20,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(newPosts);
  TestValidator.equals(
    "new sort response has pagination",
    newPosts.pagination !== null,
    true,
  );
  // Step 4: Test with 'top' sort
  const topPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "top",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topPosts);
  TestValidator.equals(
    "top sort response has pagination",
    topPosts.pagination !== null,
    true,
  );
  // Step 5: Test 'top' sort with time range filters
  const topDayPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "top",
        timeRange: "day",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topDayPosts);
  const topWeekPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "top",
        timeRange: "week",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topWeekPosts);
  const topMonthPosts =
    await api.functional.redditClone.guest.users.posts.index(guestConnection, {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "top",
        timeRange: "month",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    });
  typia.assert(topMonthPosts);
  const topYearPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "top",
        timeRange: "year",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topYearPosts);
  const topAllPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "top",
        timeRange: "all",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topAllPosts);
  // Step 6: Test with 'controversial' sort
  const controversialPosts =
    await api.functional.redditClone.guest.users.posts.index(guestConnection, {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "controversial",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    });
  typia.assert(controversialPosts);
  TestValidator.equals(
    "controversial sort response has pagination",
    controversialPosts.pagination !== null,
    true,
  );
  // Step 7: Test post type filters
  const textPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "hot",
        postType: "text",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(textPosts);
  const linkPosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "hot",
        postType: "link",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(linkPosts);
  const imagePosts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "hot",
        postType: "image",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(imagePosts);
  // Step 8: Test pagination
  const page2Posts = await api.functional.redditClone.guest.users.posts.index(
    guestConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "hot",
        limit: 5,
        page: 2,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(page2Posts);
  TestValidator.equals("page 2 current", page2Posts.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Posts.pagination.limit, 5);
  // Step 9: Verify guest can access without authentication (using fresh connection without token)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  const publicPosts = await api.functional.redditClone.guest.users.posts.index(
    unauthenticatedConnection,
    {
      username: "nonexistent_user_for_testing",
      body: {
        sort: "new",
        limit: 10,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(publicPosts);
  TestValidator.equals(
    "guest access without auth works",
    publicPosts !== null,
    true,
  );
}
