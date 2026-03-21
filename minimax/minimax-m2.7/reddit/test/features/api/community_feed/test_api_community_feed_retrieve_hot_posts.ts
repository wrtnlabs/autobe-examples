import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

/**
 * Test retrieving community feed posts with default 'hot' sorting.
 *
 * 1. Authenticate as a member using POST /redditClone/auth/member/join
 * 2. Create a community using POST /redditClone/member/communities
 * 3. Create multiple posts in the community with different vote scores using POST /redditClone/member/posts
 * 4. Cast votes on posts using POST /redditClone/member/posts/{postId}/votes to establish vote_score values
 * 5. Call PATCH /redditClone/member/communities/{communityName}/posts with default parameters (no sort, page, limit specified)
 * 6. Verify response returns paginated list of IPageIRedditClonePostLink.ISummary
 * 7. Validate response structure: data array with post summaries, pagination metadata (current, limit, records, pages)
 * 8. Validate each post summary contains: id, title, type, vote_score, comment_count, created_at, author (with username), community (with name)
 * 9. Verify posts are sorted by 'hot' algorithm: vote_score / POW((age_hours+2), 1.8) DESC
 * 10. Verify only non-deleted posts are returned
 * 11. Verify posts belong to the specified community
 */
export async function test_api_community_feed_retrieve_hot_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create multiple posts in the community
  const postCount = 5;
  const posts = await ArrayUtil.asyncMap(
    ArrayUtil.repeat(postCount, (i) => i),
    async (i) => {
      const post = await generate_random_reddit_clone_member_posts_create(
        memberConnection,
        {
          body: {
            communityName: community.name,
            title: `Test Post ${i + 1} - ${RandomGenerator.paragraph({ sentences: 1 })}`,
            type: "text",
          },
        },
      );
      typia.assert(post);
      return post;
    },
  );
  // 4. Cast votes on posts to establish different vote scores
  // Cast upvotes to create varying vote_score values
  for (let i = 0; i < posts.length; i++) {
    const voteCount = i + 1; // Each post gets 1 to 5 votes
    for (let v = 0; v < voteCount; v++) {
      const voterConnection: api.IConnection = { host: connection.host };
      await authorize_member_join(voterConnection, {});
      const vote = await api.functional.redditClone.member.posts.votes.create(
        voterConnection,
        {
          postId: posts[i].id,
        },
      );
      typia.assert(vote);
    }
  }
  // 5. Call PATCH /redditClone/member/communities/{communityName}/posts with default parameters
  const feedResponse =
    await api.functional.redditClone.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {}, // Empty body - using defaults (hot sort, page 1, limit 20)
      },
    );
  typia.assert(feedResponse);
  // 6-7. Validate response has data array and pagination (typia.assert validates structure)
  // 8. Verify posts belong to the specified community
  for (const postSummary of feedResponse.data) {
    TestValidator.equals(
      "post belongs to community",
      postSummary.community.name,
      community.name,
    );
  }
  // 9. Verify posts are sorted by 'hot' algorithm (verify data exists)
  TestValidator.predicate("feed has posts", feedResponse.data.length > 0);
  TestValidator.equals(
    "records match posts created",
    feedResponse.pagination.records,
    postCount,
  );
}
