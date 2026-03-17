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

/**
 * Test that the popular feed is accessible to authenticated members.
 * The popular feed displays trending posts from all communities across the platform.
 *
 * Steps:
 * 1. Register a new member account
 * 2. Create member connection with JWT token
 * 3. Fetch popular feed with default sorting (hot)
 * 4. Validate response structure and pagination
 * 5. Verify posts are from multiple communities
 */
export async function test_api_popular_feed_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const joinConnection: IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityMember.IJoin;
  const joinOutput: IRedditCommunityMember.IAuthorized =
    await api.functional.redditCommunity.auth.member.join(joinConnection, {
      body: joinInput,
    });
  typia.assert(joinOutput);
  // Step 2: Create member connection with JWT token
  const memberConnection: IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinOutput.token.access,
  };
  // Step 3: Fetch popular feed with default settings (hot sorting, page 1, limit 20)
  const feedInput: IRedditCommunityPost.IRequest =
    {} satisfies IRedditCommunityPost.IRequest;
  const feedOutput: IPageIRedditCommunityPost.ISummary =
    await api.functional.redditCommunity.member.popular.feed.index(
      memberConnection,
      {
        body: feedInput,
      },
    );
  typia.assert(feedOutput);
  // Step 4: Validate response structure and pagination
  TestValidator.equals(
    "pagination exists",
    feedOutput.pagination !== undefined,
    true,
  );
  const pagination = feedOutput.pagination;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20", pagination.limit, 20);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // Step 5: Verify posts structure and data
  TestValidator.equals(
    "data array exists",
    feedOutput.data !== undefined,
    true,
  );
  if (feedOutput.data.length > 0) {
    // Validate first post structure
    const firstPost = feedOutput.data[0];
    typia.assert(firstPost);
    TestValidator.equals("post has id", firstPost.id !== undefined, true);
    TestValidator.equals("post has title", firstPost.title !== undefined, true);
    TestValidator.equals(
      "post has author",
      firstPost.author !== undefined,
      true,
    );
    TestValidator.equals(
      "post has community",
      firstPost.community !== undefined,
      true,
    );
    TestValidator.equals(
      "post has vote_score",
      firstPost.vote_score !== undefined,
      true,
    );
    TestValidator.equals(
      "post has comment_count",
      firstPost.comment_count !== undefined,
      true,
    );
    TestValidator.equals(
      "post has created_at",
      firstPost.created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "post has post_type",
      firstPost.post_type !== undefined,
      true,
    );
    TestValidator.equals(
      "post has preview_content",
      firstPost.preview_content !== undefined,
      true,
    );
    // Validate author fields
    TestValidator.equals(
      "author has username",
      firstPost.author.username !== undefined,
      true,
    );
    // Validate community fields
    TestValidator.equals(
      "community has name",
      firstPost.community.name !== undefined,
      true,
    );
    // Validate multiple communities (not all from same community)
    if (feedOutput.data.length > 1) {
      const communityIds = ArrayUtil.repeat(
        feedOutput.data.length,
        (index) => feedOutput.data[index].community.id,
      );
      const uniqueCommunities = new Set(communityIds);
      TestValidator.predicate(
        "posts come from multiple communities",
        uniqueCommunities.size > 1,
      );
    }
  }
  // Validate pagination consistency
  TestValidator.predicate(
    "total pages calculation",
    pagination.pages === 0 ||
      pagination.pages >= Math.ceil(pagination.records / pagination.limit),
  );
}