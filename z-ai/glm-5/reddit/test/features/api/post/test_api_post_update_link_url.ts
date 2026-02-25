import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_post_update_link_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a LINK post with initial URL
  const initialUrl = "https://example.com/initial-article";
  const initialTitle = RandomGenerator.paragraph({ sentences: 2 });
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        title: initialTitle,
        post_type: "LINK",
        link_url: initialUrl,
      },
    },
  );
  typia.assert(post);
  // Verify initial state
  TestValidator.equals("initial post type", post.postType, "LINK");
  TestValidator.equals("initial link_url", post.linkUrl, initialUrl);
  TestValidator.equals("initial text_content is null", post.textContent, null);
  TestValidator.equals("initial image_url is null", post.imageUrl, null);
  TestValidator.equals("initial edited_at is null", post.editedAt, null);
  // 5. Update the post with new title and link_url
  const newUrl = "https://example.com/updated-article";
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const updatedPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: newTitle,
        link_url: newUrl,
      } satisfies ICommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the update results
  TestValidator.equals("updated title", updatedPost.title, newTitle);
  TestValidator.equals("updated link_url", updatedPost.linkUrl, newUrl);
  TestValidator.equals(
    "text_content remains null after update",
    updatedPost.textContent,
    null,
  );
  TestValidator.equals(
    "image_url remains null after update",
    updatedPost.imageUrl,
    null,
  );
  TestValidator.predicate(
    "edited_at is set after update",
    updatedPost.editedAt !== null,
  );
  TestValidator.equals(
    "post type unchanged after update",
    updatedPost.postType,
    "LINK",
  );
}
