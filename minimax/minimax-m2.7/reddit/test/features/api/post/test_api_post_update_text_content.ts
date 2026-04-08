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

export async function test_api_post_update_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  // 4. Create the original text post
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalBody = RandomGenerator.content({ paragraphs: 3 });
  const originalPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        type: "text",
        title: originalTitle,
        body: originalBody,
        communityId: community.id,
      },
    },
  );
  typia.assert(originalPost);
  // Store original timestamps
  const originalCreatedAt = originalPost.createdAt;
  const originalUpdatedAt = originalPost.updatedAt;
  // 5. Update the post with new title and body
  const newTitle = RandomGenerator.paragraph({ sentences: 1 });
  const newBody = RandomGenerator.content({ paragraphs: 2 });
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: originalPost.id,
      body: {
        title: newTitle,
        content: {
          body: newBody,
        },
      } satisfies IRedditClonePost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the update
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals(
    "body content updated",
    updatedPost.textContent.body,
    newBody,
  );
  TestValidator.equals(
    "createdAt preserved",
    updatedPost.createdAt,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updatedAt is newer",
    new Date(updatedPost.updatedAt) > new Date(originalUpdatedAt),
  );
  TestValidator.equals("author unchanged", updatedPost.author.id, member.id);
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals("type unchanged", updatedPost.type, "text");
  TestValidator.equals("voteScore unchanged", updatedPost.voteScore, 0);
  TestValidator.equals("commentCount unchanged", updatedPost.commentCount, 0);
}
