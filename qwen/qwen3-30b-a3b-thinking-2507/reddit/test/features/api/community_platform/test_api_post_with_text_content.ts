import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_with_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as new member
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userConnection, { body: {} });
  // 2. Create community for testing
  const community =
    await generate_random_community_platform_member_communities_create(
      userConnection,
      { body: {} },
    );
  // 3. Subscribe to the community to enable post creation
  await api.functional.communityPlatform.member.communities.subscriptions.create(
    userConnection,
    { communityId: community.id },
  );
  // 4. Create text post with content constraints
  const textContent = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 15,
  });
  const post = await generate_random_community_platform_member_posts_create(
    userConnection,
    {
      body: {
        title: `Test Post ${new Date().getTime()}`,
        content_type: "text",
        textContent,
        community_id: community.id,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Validate post content
  TestValidator.equals("Post content type", post.content_type, "text");
  TestValidator.equals("Post community ID", post.community.id, community.id);
  TestValidator.predicate(
    "Text content length ≤ 500",
    textContent.length <= 500,
  );
  TestValidator.equals(
    "Post title matches content",
    post.title,
    `Test Post ${new Date().getTime()}`,
  );
}
