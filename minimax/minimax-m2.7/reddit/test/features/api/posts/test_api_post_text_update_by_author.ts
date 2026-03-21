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

export async function test_api_post_text_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community for the post
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
      },
    },
  );
  // 4. Create an initial text post (without textBody - it's added via update)
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalBody = RandomGenerator.paragraph({ sentences: 5 });
  const originalPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        communityName: community.name,
        type: "text" as const,
      },
    },
  );
  typia.assert(originalPost);
  // 4b. Add initial text content via update
  const postWithInitialContent =
    await api.functional.redditClone.member.posts.update(memberConnection, {
      postId: originalPost.id,
      body: {
        title: originalTitle,
        textBody: originalBody,
      } satisfies IRedditClonePostLink.IUpdate,
    });
  typia.assert(postWithInitialContent);
  // Store original updated_at for comparison
  const originalUpdatedAt = postWithInitialContent.updated_at;
  // Wait a bit to ensure updated_at timestamp changes
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Update the text post with new content
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newBody = RandomGenerator.paragraph({ sentences: 3 });
  const updatedPost = await api.functional.redditClone.member.posts.update(
    memberConnection,
    {
      postId: originalPost.id,
      body: {
        title: newTitle,
        textBody: newBody,
      } satisfies IRedditClonePostLink.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the updated post
  TestValidator.equals("post id unchanged", updatedPost.id, originalPost.id);
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals("text body updated", updatedPost.textBody, newBody);
  TestValidator.equals("type remains text", updatedPost.type, "text");
  TestValidator.equals("author preserved", updatedPost.author.id, member.id);
  TestValidator.equals(
    "community preserved",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedPost.updated_at !== originalUpdatedAt,
  );
}
