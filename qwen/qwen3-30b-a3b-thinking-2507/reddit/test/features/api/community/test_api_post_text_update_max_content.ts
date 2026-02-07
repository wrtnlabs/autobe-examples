import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTextContent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_text_update_max_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword",
      name: RandomGenerator.name(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2. Create post for text update
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_type: "text",
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // 3. Create 2000-character content
  const fullContent = RandomGenerator.paragraph({ sentences: 50 });
  const contentToPost = fullContent.substring(0, 2000);
  // 4. Update post text with maximum allowed content
  const updatedPost = await api.functional.communityPlatform.posts.text.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        content:
          contentToPost satisfies ICommunityPlatformPostTextContent.IUpdate["content"],
      },
    },
  );
  typia.assert(updatedPost);
  // 5. Verify preview contains first 200 characters
  const expectedPreview = contentToPost.substring(0, 200);
  TestValidator.equals(
    "preview matches first 200 characters",
    expectedPreview,
    updatedPost.preview,
  );
}
