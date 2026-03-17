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
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_update_link_url_recalculates_domain(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // Step 4: Create a link-type post with an initial URL
  const initialUrl = "https://www.example.com/article/123";
  const initialTitle = "Initial Link Post Title";
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: initialTitle,
        type: "link",
        url: initialUrl,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Extract initial domain from the initial post content
  // Cast directly to ILinkContent since we know the post was created as link type
  const initialContent = post.content as ICommunityPost.ILinkContent;
  if ((initialContent as { type?: string }).type !== "link") {
    throw new Error("Expected post content type to be 'link'");
  }
  const initialDomain = initialContent.domain;
  // Test execution: Update the post with a new URL and new title
  const newUrl = "https://www.different-site.org/news/456";
  const newTitle = "Updated Link Post Title";
  const updatedPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: newTitle,
        url: newUrl,
      } satisfies ICommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // Assert post type remains 'link'
  TestValidator.equals("post type is link", updatedPost.type, "link");
  // Cast the updated content to ILinkContent
  const updatedContent = updatedPost.content as ICommunityPost.ILinkContent;
  if ((updatedContent as { type?: string }).type !== "link") {
    throw new Error("Expected updated post content type to be 'link'");
  }
  // Assert URL is updated
  TestValidator.equals("url updated", updatedContent.url, newUrl);
  // Assert domain is different from the initial domain (server re-extracted it)
  TestValidator.notEquals(
    "domain recalculated from new URL",
    updatedContent.domain,
    initialDomain,
  );
  // Assert title is updated
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  // Assert updatedAt is a valid date-time (post has been updated)
  TestValidator.predicate(
    "updatedAt is valid date-time",
    new Date(updatedPost.updatedAt).getTime() > 0,
  );
}
