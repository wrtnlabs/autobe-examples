import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_subscribers_create } from "../../../generate/generate_random_community_platform_member_communities_subscribers_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_retrieve_text_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Subscribe the member to the community
  const subscription =
    await generate_random_community_platform_member_communities_subscribers_create(
      memberConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // Step 4: Create a text-type post
  const postBody: string = RandomGenerator.paragraph({ sentences: 3 });
  const postTitle: string = RandomGenerator.paragraph({ sentences: 1 });
  const createdPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          type: "text",
          title: postTitle,
          body: postBody,
        },
      },
    );
  typia.assert(createdPost);
  // Step 5: Retrieve the post
  const retrievedPost = await api.functional.communityPlatform.member.posts.at(
    memberConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);
  // Step 6: Validate basic fields
  TestValidator.equals("post id matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("post type is text", retrievedPost.type, "text");
  TestValidator.equals("title matches", retrievedPost.title, postTitle);
  TestValidator.equals("initial vote score is 0", retrievedPost.vote_score, 0);
  TestValidator.equals(
    "initial comment count is 0",
    retrievedPost.comment_count,
    0,
  );
  TestValidator.predicate("created_at is valid ISO datetime", () => {
    const parsed = new Date(retrievedPost.created_at);
    return !isNaN(parsed.getTime());
  });
  TestValidator.equals(
    "updated_at is null (never edited)",
    retrievedPost.updated_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null (active post)",
    retrievedPost.deleted_at,
    null,
  );
  // Step 7: Validate author object
  typia.assert(retrievedPost.author);
  // Step 8: Validate community object
  TestValidator.equals(
    "community id matches",
    retrievedPost.community.id,
    community.id,
  );
  // Step 9: Validate text content is present
  TestValidator.predicate(
    "text object exists",
    retrievedPost.text !== undefined,
  );
  const textContent = retrievedPost.text!;
  TestValidator.equals("text body matches input", textContent.body, postBody);
  TestValidator.predicate("text created_at is valid ISO datetime", () => {
    const parsed = new Date(textContent.created_at);
    return !isNaN(parsed.getTime());
  });
  // Step 10: Validate link and image are absent (type discriminator exclusivity)
  TestValidator.equals(
    "link is absent for text post",
    retrievedPost.link,
    undefined,
  );
  TestValidator.equals(
    "image is absent for text post",
    retrievedPost.image,
    undefined,
  );
}
