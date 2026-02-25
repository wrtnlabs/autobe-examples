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
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test that only the post author can update their post.
 *
 * This test validates authorization enforcement for post updates:
 * 1. Member A creates a community (auto-subscribed as owner)
 * 2. Member A creates a post in the community
 * 3. Member B attempts to update Member A's post
 * 4. Verify Member B receives 403 FORBIDDEN error
 * 5. Verify the original post remains unchanged
 */
export async function test_api_post_update_author_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community (auto-subscribed as owner)
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member A creates a post
  const post = await generate_random_community_member_communities_posts_create(
    memberAConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(post);
  // Store original values for verification
  const originalTitle = post.title;
  const originalTextContent = post.textContent;
  const originalEditedAt = post.editedAt;
  // 4. Create Member B (unauthorized user)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 5. Member B attempts to update Member A's post - should fail with 403 FORBIDDEN
  await TestValidator.httpError(
    "Member B cannot update Member A's post",
    403,
    async () => {
      await api.functional.community.member.posts.update(memberBConnection, {
        postId: post.id,
        body: {
          title: "Hacked Title",
          text_content: "Hacked Content",
        } satisfies ICommunityPost.IUpdate,
      });
    },
  );
  // 6. Verify original post remains unchanged
  TestValidator.equals("title unchanged", post.title, originalTitle);
  TestValidator.equals(
    "text content unchanged",
    post.textContent,
    originalTextContent,
  );
  TestValidator.equals(
    "edited_at remains null",
    post.editedAt,
    originalEditedAt,
  );
}
