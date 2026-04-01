import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - join as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community to host the post
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community - required before creating posts
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post that will be updated
  const originalTitle = RandomGenerator.paragraph({ sentences: 1 });
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text" as const,
        title: originalTitle,
        text_content: originalContent,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Store original timestamps for comparison
  const originalCreatedAt = post.created_at;
  // 5. Update the post with new title and content
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const updatedContent = RandomGenerator.content({ paragraphs: 3 });
  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: updatedTitle,
        text_content: updatedContent,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the update results
  // Verify title was updated
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  // Verify text content was updated
  TestValidator.equals(
    "text_content updated",
    updatedPost.text_content,
    updatedContent,
  );
  // Verify post_type remains unchanged (cannot change type after creation)
  TestValidator.equals("post_type unchanged", updatedPost.post_type, "text");
  // Verify author relation is preserved
  TestValidator.equals(
    "author preserved",
    updatedPost.author.id,
    memberAuth.id,
  );
  // Verify community relation is preserved
  TestValidator.equals(
    "community preserved",
    updatedPost.community.id,
    community.id,
  );
  // Verify updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedPost.updated_at) > new Date(originalCreatedAt),
  );
  // Verify vote_score is present (starts at 0)
  TestValidator.predicate("vote_score exists", updatedPost.vote_score >= 0);
  // Verify comments_count is present (starts at 0)
  TestValidator.predicate(
    "comments_count exists",
    updatedPost.comments_count >= 0,
  );
}
