import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_link_url_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community (creator becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a link post
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postUrl =
    "https://example.com/article/" + RandomGenerator.alphaNumeric(8);
  const post =
    await api.functional.communityPlatform.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: postTitle,
          postType: "link",
          url: postUrl,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // 4. Verify the response - business logic only (typia.assert validates types)
  TestValidator.equals("title matches", post.title, postTitle);
  TestValidator.equals("postType is link", post.postType, "link");
  TestValidator.equals("url matches", post.url, postUrl);
  TestValidator.equals("content is null for link post", post.content, null);
  TestValidator.equals("voteScore initialized to 0", post.voteScore, 0);
  TestValidator.equals("commentCount initialized to 0", post.commentCount, 0);
  TestValidator.equals("author ID matches", post.author.id, member.id);
  TestValidator.equals("community ID matches", post.community.id, community.id);
  TestValidator.equals("deletedAt is null", post.deletedAt, null);
}
