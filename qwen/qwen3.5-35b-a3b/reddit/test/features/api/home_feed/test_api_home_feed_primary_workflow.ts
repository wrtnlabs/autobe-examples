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

export async function test_api_home_feed_primary_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const authConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Access home feed with authenticated member
  const feedConnection: api.IConnection = { host: connection.host };
  const feedResult =
    await api.functional.redditCommunity.member.home_feed.index(
      feedConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(feedResult);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    feedResult.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", feedResult.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    feedResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    feedResult.pagination.pages >= 0,
  );
  // 4. Validate response structure - data should be array
  TestValidator.equals(
    "response has data array",
    Array.isArray(feedResult.data),
    true,
  );
  // 5. Validate post summary structure if any posts exist
  if (feedResult.data.length > 0) {
    const firstPost = feedResult.data[0];
    typia.assert(firstPost);
    // Validate required fields exist
    TestValidator.predicate(
      "post has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstPost.id,
      ),
    );
    TestValidator.predicate("post has title", firstPost.title.length > 0);
    TestValidator.predicate(
      "post has vote score is number",
      typeof firstPost.vote_score === "number",
    );
    TestValidator.predicate(
      "post has comment count is number",
      typeof firstPost.comment_count === "number",
    );
    TestValidator.predicate(
      "post has valid date-time created_at",
      !isNaN(Date.parse(firstPost.created_at)),
    );
    TestValidator.predicate(
      "post has valid post_type",
      ["text", "link", "image"].includes(firstPost.post_type),
    );
    // Validate author and community exist
    TestValidator.predicate(
      "post has author",
      firstPost.author !== null && firstPost.author !== undefined,
    );
    TestValidator.predicate(
      "post has community",
      firstPost.community !== null && firstPost.community !== undefined,
    );
    TestValidator.predicate(
      "author has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstPost.author.id,
      ),
    );
    TestValidator.predicate(
      "author has username",
      typeof firstPost.author.username === "string",
    );
    TestValidator.predicate(
      "community has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstPost.community.id,
      ),
    );
    TestValidator.predicate(
      "community has name",
      typeof firstPost.community.name === "string",
    );
  }
}
