import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_text_post_content_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member1
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.alphabets(8),
      href: "https://example.com",
      referrer: "https://google.com",
    },
  });
  typia.assert(memberAuth);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text post with original content
  const originalTitle = "Original Title";
  const originalBody = "Original body content";
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        type: "text" as const,
        body: originalBody,
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // Store original timestamp for comparison
  const createdAt = new Date(post.createdAt).getTime();
  // 5. Update the text post's body
  const updatedBody = "Updated body content";
  const updatedPost =
    await api.functional.redditClone.member.posts.text_content.updateTextContent(
      memberConnection,
      {
        postId: post.id,
        body: {
          body: updatedBody,
        },
      },
    );
  typia.assert(updatedPost);
  // 6. Validate the update
  TestValidator.equals("post id unchanged", updatedPost.id, post.id);
  TestValidator.equals("title unchanged", updatedPost.title, originalTitle);
  TestValidator.equals(
    "body updated",
    updatedPost.textContent.body,
    updatedBody,
  );
  TestValidator.equals("type remains text", updatedPost.type, "text");
  TestValidator.equals(
    "author matches member",
    updatedPost.author.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "updatedAt is more recent than createdAt",
    new Date(updatedPost.updatedAt).getTime() > createdAt,
  );
}
