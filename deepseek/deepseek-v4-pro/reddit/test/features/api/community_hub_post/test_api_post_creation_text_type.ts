import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test that an authenticated, subscribed member can successfully create a text-type post within a community.
 *
 * Validates the complete text post creation flow from member registration through publication. The test ensures that a member who has joined the platform, created a community, and subscribed to it can publish a text post with a title and body. The response is verified to contain all required fields with correct initialization — the post type, title, and body match the submitted values, the vote_score and comment_count initialize to zero, and text-post-specific fields url and image are null.
 *
 * 1. A new member joins the platform via authorize_member_join and receives authentication credentials.
 * 2. The member creates a new community, becoming its permanent owner.
 * 3. The member subscribes to the newly created community — a prerequisite for posting.
 * 4. A text-type post is created with a generated title and body within the subscribed community.
 * 5. The response is validated: type equals "text", title and body match input, vote_score is 0, comment_count is 0, url is null, image is null, author matches the authenticated member, and community matches the created community.
 */
export async function test_api_post_creation_text_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to the community
  await api.functional.communityHub.member.communities.subscriptions.create(
    memberConnection,
    { communityName: community.name },
  );
  // 4. Create a text post
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const textBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: {
        type: "text",
        title,
        body: textBody,
      },
      params: { communityName: community.name },
    },
  );
  // 5. Validate response
  typia.assert(post);
  TestValidator.equals("type is text", post.type, "text");
  TestValidator.equals("title matches input", post.title, title);
  TestValidator.equals("body matches input", post.body, textBody);
  TestValidator.equals("url is null for text post", post.url, null);
  TestValidator.equals("image is null for text post", post.image, null);
  TestValidator.equals("vote_score initialized to 0", post.vote_score, 0);
  TestValidator.equals("comment_count initialized to 0", post.comment_count, 0);
  TestValidator.equals(
    "author matches authenticated member",
    post.author.id,
    member.id,
  );
  TestValidator.equals(
    "community matches created community",
    post.community.name,
    community.name,
  );
}
