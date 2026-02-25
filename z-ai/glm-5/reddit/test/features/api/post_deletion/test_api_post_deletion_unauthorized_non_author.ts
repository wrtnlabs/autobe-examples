import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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
 * Test authorization enforcement: non-author cannot delete another member's post.
 *
 * This test verifies that the post deletion endpoint properly enforces authorization
 * by rejecting deletion requests from users who are not the post author.
 *
 * **Setup Steps:**
 * 1. Create member A (post author)
 * 2. Create member B (will attempt unauthorized deletion)
 * 3. Member A creates a community
 * 4. Member A creates a TEXT post in the community
 *
 * **Test Execution:**
 * 1. Member B attempts to delete Member A's post
 * 2. Verify the request fails with 403 Forbidden
 */
export async function test_api_post_deletion_unauthorized_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Member A (post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Setup Member B (will attempt unauthorized deletion)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 3. Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 4. Member A creates a TEXT post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberAConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Member B attempts to delete Member A's post - should fail with 403
  await TestValidator.httpError(
    "non-author cannot delete another member's post",
    403,
    async () => {
      await api.functional.community.member.posts.erase(memberBConnection, {
        postId: post.id,
      });
    },
  );
}
