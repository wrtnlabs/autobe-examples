import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_post_link_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection with authentication
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
        community_id: community.id,
      } satisfies IRedditClonePostTextContent.ICreate,
    },
  );
  // 4. Create an initial link post with original URL
  const originalUrl = "https://original-example.com/article";
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "link" as const,
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  // Store the original updated_at timestamp
  const originalUpdatedAt = linkPost.updated_at;
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Update the link post's URL with new title
  const updatedTitle = RandomGenerator.paragraph({ sentences: 1 });
  const newUrl = "https://updated-example.com/new-article";
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: linkPost.id,
      body: {
        title: updatedTitle,
        linkUrl: newUrl,
      } satisfies IRedditClonePostLink.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the update
  TestValidator.equals("post ID unchanged", updatedPost.id, linkPost.id);
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  TestValidator.equals("linkUrl updated", updatedPost.linkUrl, newUrl);
  TestValidator.predicate(
    "updated_at timestamp modified",
    updatedPost.updated_at !== originalUpdatedAt,
  );
  TestValidator.equals("type remains link", updatedPost.type, "link");
  TestValidator.equals("author unchanged", updatedPost.author.id, member.id);
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
}
