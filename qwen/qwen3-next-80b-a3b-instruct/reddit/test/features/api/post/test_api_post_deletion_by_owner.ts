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
export async function test_api_post_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create community owner (first member) and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  // Step 2: Create community (owner becomes owner automatically)
  const communityName = RandomGenerator.alphaNumeric(8);
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {},
      },
    );
  // Step 3: Create second member (post author) and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  const author: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(authorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  // Step 4: Create post as author
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_communities_posts_create(
      authorConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 3,
            wordMax: 7,
          }),
          text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        },
        params: {
          communityName: community.community_code,
        },
      },
    );
  // Step 5: Use owner connection to delete the post (owner privilege)
  const deletedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.erase(
      ownerConnection,
      {
        communityCode: community.community_code,
        postCode: post.id,
      },
    );
  // Step 6: Validate post deletion
  typia.assert(deletedPost);
  TestValidator.equals(
    "deleted post ID matches original post ID",
    deletedPost.id,
    post.id,
  );
  // Note: Cannot validate author.id since ICommunityPlatformMember.ISummary is {} with no properties
  // The owner successfully deleted the post, verifying owner privileges override author ownership
}
