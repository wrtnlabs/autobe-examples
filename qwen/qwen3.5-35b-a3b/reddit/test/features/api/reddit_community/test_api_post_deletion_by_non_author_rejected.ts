import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_deletion_by_non_author_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuthorized = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuthorized);
  // 2. List available communities to find one for posting
  const communities = await api.functional.redditCommunity.communities.index(
    authorConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IRedditCommunityCommunity.IRequest,
    },
  );
  typia.assert(communities);
  TestValidator.notEquals(
    "communities list is not empty",
    communities.data.length,
    0,
  );
  const community = communities.data[0];
  // 3. Author creates a post in the community
  const post = await api.functional.redditCommunity.member.posts.create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Verify post exists and is accessible by author
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    authorConnection,
    { postId: post.id },
  );
  typia.assert(retrievedPost);
  TestValidator.equals("post id matches", retrievedPost.id, post.id);
  // 5. Create second member account (non-author attempting deletion)
  const nonAuthorConnection: api.IConnection = { host: connection.host };
  const nonAuthorAuthorized = await authorize_member_join(nonAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(nonAuthorAuthorized);
  // 6. Non-author attempts to delete the post - should be rejected with 403
  await TestValidator.httpError(
    "non-author deletion should be rejected with 403 Forbidden",
    403,
    async () => {
      await api.functional.redditCommunity.member.posts.erase(
        nonAuthorConnection,
        { postId: post.id },
      );
    },
  );
  // 7. Verify the original post still exists and is accessible
  const postAfterAttempt = await api.functional.redditCommunity.posts.at(
    nonAuthorConnection,
    { postId: post.id },
  );
  typia.assert(postAfterAttempt);
  TestValidator.equals(
    "post still exists after failed deletion attempt",
    postAfterAttempt.id,
    post.id,
  );
  TestValidator.equals(
    "post owner remains unchanged",
    postAfterAttempt.author.id,
    post.author.id,
  );
}
