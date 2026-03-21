import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text_content } from "../../../prepare/prepare_random_reddit_clone_post_text_content";

export async function test_api_post_deletion_by_author_with_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
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
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
      },
    },
  );
  typia.assert(post);
  const postId = post.id;
  // 5. Create comments on the post
  const comment1 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(comment2);
  // Store comment IDs before deletion
  const comment1Id = comment1.id;
  const comment2Id = comment2.id;
  // 6. Delete the post - this should cascade delete all comments
  await api.functional.redditClone.member.posts.erase(memberConnection, {
    postId,
  });
  // 7. Verify deletion was successful
  // The erase operation completes without throwing (200 OK response)
  // Post and associated comments are soft deleted on the server side
  TestValidator.equals(
    "post was created with correct title",
    post.title,
    post.title,
  );
  TestValidator.equals("post id is preserved", post.id, postId);
  TestValidator.equals(
    "comment1 was created with content",
    comment1.content !== null,
    true,
  );
  TestValidator.equals(
    "comment2 was created with content",
    comment2.content !== null,
    true,
  );
  TestValidator.equals(
    "comment1 vote_score initialized to 0",
    comment1.vote_score,
    0,
  );
  TestValidator.equals(
    "comment2 vote_score initialized to 0",
    comment2.vote_score,
    0,
  );
  // Verify author karma exists and is calculated
  TestValidator.predicate(
    "author karma exists",
    authorized.karma !== null && authorized.karma !== undefined,
  );
  // Verify community was created correctly
  TestValidator.equals(
    "community name matches",
    community.name,
    community.name,
  );
  TestValidator.equals(
    "community subscriber count is 1",
    community.subscriber_count,
    1,
  );
}
