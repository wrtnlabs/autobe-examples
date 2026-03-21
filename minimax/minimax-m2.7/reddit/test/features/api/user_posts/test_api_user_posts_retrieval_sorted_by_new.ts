import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_user_posts_retrieval_sorted_by_new(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member and extract username
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );
  // 4. Create multiple posts in the community
  const postCount = 3;
  const createdPosts = await Promise.all(
    Array.from({ length: postCount }, async () => {
      const post = await generate_random_reddit_clone_member_posts_create(
        memberConnection,
        {
          body: {
            communityName: community.name,
            title: RandomGenerator.paragraph({ sentences: 1 }),
            type: "text",
          },
        },
      );
      typia.assert(post);
      return post;
    }),
  );
  // Small delay to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Create one more post to have a newer timestamp
  const latestPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
      },
    },
  );
  typia.assert(latestPost);
  // 5. Retrieve user's posts sorted by 'new'
  const userPostsResponse =
    await api.functional.redditClone.member.users.posts.index(
      memberConnection,
      {
        username: authorized.username,
        body: {
          sort: "new",
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(userPostsResponse);
  // 6. Validate response structure and sorting
  TestValidator.equals(
    "has pagination metadata",
    userPostsResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "has pagination data",
    userPostsResponse.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination current is 1",
    userPostsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    userPostsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    userPostsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    userPostsResponse.pagination.pages >= 0,
  );
  // 7. Validate sorting - posts should be sorted by created_at descending (newest first)
  const posts = userPostsResponse.data;
  if (posts.length > 1) {
    for (let i = 0; i < posts.length - 1; i++) {
      const current = new Date(posts[i].created_at).getTime();
      const next = new Date(posts[i + 1].created_at).getTime();
      TestValidator.predicate(
        `Post ${i} should be newer than post ${i + 1}`,
        current >= next,
      );
    }
  }
  // 8. Validate all returned posts belong to the authenticated user
  for (const post of posts) {
    TestValidator.equals(
      "author username matches",
      post.author.username,
      authorized.username,
    );
  }
  // 9. Validate all posts belong to the created community
  for (const post of posts) {
    TestValidator.equals(
      "community name matches",
      post.community.name,
      community.name,
    );
  }
  // 10. Validate post summary structure
  for (const post of posts) {
    TestValidator.predicate("post has id", post.id !== undefined);
    TestValidator.predicate("post has title", post.title !== undefined);
    TestValidator.predicate("post has type", post.type !== undefined);
    TestValidator.predicate(
      "post has vote_score",
      post.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post has comment_count",
      post.comment_count !== undefined,
    );
    TestValidator.predicate(
      "post has created_at",
      post.created_at !== undefined,
    );
  }
}
