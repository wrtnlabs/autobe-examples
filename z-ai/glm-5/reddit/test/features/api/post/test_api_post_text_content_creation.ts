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

export async function test_api_post_text_content_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create a community (member becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Create a text post
  const title = RandomGenerator.paragraph({ sentences: 1 });
  const content = RandomGenerator.paragraph({ sentences: 5 });
  const post =
    await api.functional.communityPlatform.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title,
          postType: "text",
          content,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // 4. Validate business rules
  TestValidator.equals("post title", post.title, title);
  TestValidator.equals("post content", post.content, content);
  TestValidator.equals("vote score starts at zero", post.voteScore, 0);
  TestValidator.equals("comment count starts at zero", post.commentCount, 0);
  TestValidator.equals("author ID", post.author.id, member.id);
  TestValidator.equals("community ID", post.community.id, community.id);
}
