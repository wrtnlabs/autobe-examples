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
 * Test image-type post creation by an authenticated, subscribed member.
 *
 * Validates the complete flow from member registration through image post
 * creation: joining as a new member, creating a community, subscribing to
 * enable posting, and finally creating an image-type post with an uploaded
 * image file. The test confirms that the response contains all expected
 * fields including the image metadata record.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a new community.
 * 3. Member subscribes to the newly created community.
 * 4. Member creates an image post with a title and an uploaded image file.
 * 5. Validates post metadata: type is "image", title matches, body/url are
 *    null, vote_score and comment_count start at 0, author and community
 *    match the authenticated member and target community.
 * 6. Validates image metadata: id, original_path, thumbnail_path, byte_size,
 *    width, height, mime_type are populated, and the post reference points
 *    back to the created post.
 */
export async function test_api_post_creation_image_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create an image post
  const title = RandomGenerator.paragraph({ sentences: 2 });
  const post = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: {
        type: "image",
        title,
        image: {
          file: RandomGenerator.alphaNumeric(32),
        },
      } satisfies DeepPartial<ICommunityHubPost.ICreate>,
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // 5. Validate post metadata
  TestValidator.equals("post type", post.type, "image");
  TestValidator.equals("post title", post.title, title);
  TestValidator.equals("post body null", post.body, null);
  TestValidator.equals("post url null", post.url, null);
  TestValidator.equals("vote score zero", post.vote_score, 0);
  TestValidator.equals("comment count zero", post.comment_count, 0);
  // 6. Validate author matches the authenticated member
  TestValidator.equals("author id", post.author.id, member.id);
  TestValidator.equals(
    "author username",
    post.author.username,
    member.username,
  );
  // 7. Validate community matches the target
  TestValidator.equals("community id", post.community.id, community.id);
  TestValidator.equals("community name", post.community.name, community.name);
  // 8. Validate image metadata is populated
  TestValidator.predicate("image not null", post.image !== null);
  typia.assert<ICommunityHubPostImage>(post.image!);
  TestValidator.equals("image post reference id", post.image!.post.id, post.id);
  TestValidator.equals(
    "image post reference title",
    post.image!.post.title,
    post.title,
  );
}
