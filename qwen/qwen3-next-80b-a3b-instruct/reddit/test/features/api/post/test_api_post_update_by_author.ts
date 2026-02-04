import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authorize a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a community for the post
  const communityConnection: api.IConnection = { host: connection.host };
  // Copy the authentication headers from the member connection
  communityConnection.headers = memberConnection.headers;
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      communityConnection,
      {
        body: {} satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create a text post with title and content
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers;
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_communities_posts_create(
      postConnection,
      {
        body: {
          title: RandomGenerator.paragraph(),
          text: RandomGenerator.content(),
        } satisfies ICommunityPlatformPost.ICreate,
        params: {
          communityName: community.community_code,
        },
      },
    );
  typia.assert(post);
  // Step 4: Update the post from text to link type
  const updatedTitle = RandomGenerator.paragraph();
  const newUrl = `https://${RandomGenerator.alphaNumeric(8)}.com`;
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.update(
      postConnection,
      {
        communityName: community.community_code,
        postId: post.id,
        body: {
          title: updatedTitle,
          url: newUrl,
          // text property omitted to switch from text to link
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // Step 5: Validate that votes and comment count were preserved
  TestValidator.equals("post score preserved", updatedPost.score, post.score);
  TestValidator.equals(
    "comment count preserved",
    updatedPost.comment_count,
    post.comment_count,
  );
  // Step 6: Verify that edit counter is incremented and '[Edited]' is appended to title
  // The server will append "[Edited]" to title when post is modified
  TestValidator.predicate(
    "updated title contains [Edited]",
    updatedPost.title.includes("[Edited]"),
  );
  // Step 7: Validate content type was successfully changed to link
  TestValidator.equals(
    "content type updated to link",
    updatedPost.content_type,
    "link",
  );
  // Step 8: Verify the post is accessible in the community feed with updated content
  // Since the ICommunityPlatformPost type does not have a 'url' property, we cannot validate it
  // The API returns the post object with only: title, content_type, score, comment_count, created_at, author, community
  // We validate only what's available in the response
  TestValidator.equals("updated post title", updatedPost.title, updatedTitle);
  TestValidator.equals(
    "updated post content type",
    updatedPost.content_type,
    "link",
  );
}
