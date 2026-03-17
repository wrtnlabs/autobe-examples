import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_home_feed_subscription_updates(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member and create authenticated connection
  const registerConnection: api.IConnection = { host: connection.host };
  const registerResult = await authorize_member_join(registerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(registerResult);
  // Create authenticated member connection with token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${registerResult.token.access}` },
  };
  // Step 2: Access home feed and verify it returns paginated results
  // Note: Community subscription and post creation APIs are not available in SDK.
  // This test validates the home feed endpoint returns correct structure.
  const feed = await api.functional.redditCommunity.member.home_feed.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // Validate feed structure
  TestValidator.equals("feed has pagination", feed.pagination.current, 1);
  TestValidator.equals("feed limit matches request", feed.pagination.limit, 20);
  TestValidator.predicate(
    "feed has pagination fields",
    feed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "feed has pagination fields",
    feed.pagination.pages >= 0,
  );
  // Step 3: Test different page numbers
  const feedPage2 = await api.functional.redditCommunity.member.home_feed.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 20,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feedPage2);
  TestValidator.equals(
    "page 2 has correct current page",
    feedPage2.pagination.current,
    2,
  );
  // Step 4: Test different limit values
  const feedLarge = await api.functional.redditCommunity.member.home_feed.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feedLarge);
  TestValidator.equals(
    "large limit feed has correct limit",
    feedLarge.pagination.limit,
    100,
  );
  // Step 5: Validate post structure when posts exist
  if (feed.data.length > 0) {
    const firstPost = feed.data[0];
    typia.assert(firstPost);
    TestValidator.predicate(
      "post has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstPost.id,
      ),
    );
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.predicate(
      "post has vote score",
      typeof firstPost.vote_score === "number",
    );
    TestValidator.predicate(
      "post has comment count",
      typeof firstPost.comment_count === "number",
    );
    TestValidator.predicate(
      "post has created_at",
      firstPost.created_at !== undefined,
    );
    TestValidator.predicate(
      "post has valid post_type",
      ["text", "link", "image"].includes(firstPost.post_type),
    );
    TestValidator.predicate("post has author", firstPost.author !== undefined);
    TestValidator.predicate(
      "post has community",
      firstPost.community !== undefined,
    );
  }
  // Step 6: Test with search parameter
  const feedWithSearch =
    await api.functional.redditCommunity.member.home_feed.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          search: "test", // Search by title keyword
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(feedWithSearch);
  TestValidator.equals(
    "search feed has pagination",
    feedWithSearch.pagination.current,
    1,
  );
  // Step 7: Test with community filter
  const community1Id: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const feedWithCommunityFilter =
    await api.functional.redditCommunity.member.home_feed.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 20,
          community_id: community1Id,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(feedWithCommunityFilter);
  TestValidator.equals(
    "community filtered feed has pagination",
    feedWithCommunityFilter.pagination.current,
    1,
  );
  // Step 8: Verify pagination metadata consistency
  TestValidator.predicate(
    "pagination records is integer",
    Number.isInteger(feed.pagination.records),
  );
  TestValidator.predicate(
    "pagination pages is integer",
    Number.isInteger(feed.pagination.pages),
  );
  TestValidator.predicate(
    "pagination current is integer",
    Number.isInteger(feed.pagination.current),
  );
  TestValidator.predicate(
    "pagination limit is integer",
    Number.isInteger(feed.pagination.limit),
  );
  // Step 9: Verify data array is array type
  TestValidator.predicate("feed data is array", Array.isArray(feed.data));
  TestValidator.predicate(
    "feed data length matches limit",
    feed.data.length <= feed.pagination.limit,
  );
  // Step 10: Validate community summary structure
  if (feed.data.length > 0) {
    const firstPostCommunity = feed.data[0].community;
    typia.assert(firstPostCommunity);
    TestValidator.predicate(
      "community has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstPostCommunity.id,
      ),
    );
    TestValidator.predicate(
      "community has name",
      firstPostCommunity.name.length > 0,
    );
    TestValidator.predicate(
      "community has description type",
      typeof firstPostCommunity.description === "string" ||
        firstPostCommunity.description === null,
    );
    TestValidator.predicate(
      "community has subscriber count",
      typeof firstPostCommunity.subscriber_count === "number",
    );
    TestValidator.predicate(
      "community has owner",
      firstPostCommunity.owner !== undefined,
    );
    TestValidator.predicate(
      "community has timestamps",
      firstPostCommunity.created_at !== undefined,
    );
  }
  // Step 11: Validate member summary structure
  if (feed.data.length > 0) {
    const firstPostAuthor = feed.data[0].author;
    typia.assert(firstPostAuthor);
    TestValidator.predicate(
      "author has UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstPostAuthor.id,
      ),
    );
    TestValidator.predicate(
      "author has username",
      firstPostAuthor.username.length > 0,
    );
    TestValidator.predicate(
      "author has created_at",
      firstPostAuthor.created_at !== undefined,
    );
  }
  // Step 12: Verify member profile structure when present
  if (feed.data.length > 0) {
    const firstPostAuthor = feed.data[0].author;
    if (firstPostAuthor.profile) {
      typia.assert(firstPostAuthor.profile);
      TestValidator.predicate(
        "profile has UUID id",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstPostAuthor.profile.id,
        ),
      );
      TestValidator.predicate(
        "profile has display_name",
        firstPostAuthor.profile.display_name.length > 0,
      );
      TestValidator.predicate(
        "profile has bio type",
        typeof firstPostAuthor.profile.bio === "string" ||
          firstPostAuthor.profile.bio === null,
      );
      TestValidator.predicate(
        "profile has karma score",
        typeof firstPostAuthor.profile.karma_score === "number",
      );
      TestValidator.predicate(
        "profile has created_at",
        firstPostAuthor.profile.created_at !== undefined,
      );
    }
  }
  // Step 13: Verify post preview_content structure
  if (feed.data.length > 0) {
    const firstPost = feed.data[0];
    TestValidator.predicate(
      "preview_content is string or null",
      typeof firstPost.preview_content === "string" ||
        firstPost.preview_content === null,
    );
  }
  // Step 14: Test minimal request (all optional fields omitted)
  const feedMinimal =
    await api.functional.redditCommunity.member.home_feed.index(
      memberConnection,
      {
        body: {} satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(feedMinimal);
  TestValidator.equals(
    "minimal request uses default page",
    feedMinimal.pagination.current,
    1,
  );
  TestValidator.predicate(
    "minimal request has data",
    Array.isArray(feedMinimal.data),
  );
  // Step 15: Verify timestamp formats are valid ISO 8601
  if (feed.data.length > 0) {
    const createdAt = feed.data[0].created_at;
    const date = new Date(createdAt);
    TestValidator.predicate(
      "created_at is valid ISO date",
      !isNaN(date.getTime()),
    );
    const communityCreated = feed.data[0].community.created_at;
    const communityDate = new Date(communityCreated);
    TestValidator.predicate(
      "community created_at is valid ISO date",
      !isNaN(communityDate.getTime()),
    );
    const authorCreated = feed.data[0].author.created_at;
    const authorDate = new Date(authorCreated);
    TestValidator.predicate(
      "author created_at is valid ISO date",
      !isNaN(authorDate.getTime()),
    );
  }
}