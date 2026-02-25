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
 * Test successful deletion of a post owned by the authenticated member.
 *
 * This test verifies the complete post deletion workflow:
 * 1. Member creates account and authenticates
 * 2. Member creates a community (auto-subscribes as owner)
 * 3. Member creates a TEXT post in the community
 * 4. Member deletes their own post
 * 5. Verify deletion succeeds (204 No Content)
 */
export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(member);
  // Step 2: Create a community (auto-subscribes creator as owner)
  const community: ICommunityCommunity =
    await generate_random_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create a TEXT post in the community
  const post: ICommunityPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
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
  // Store initial karma for comparison
  const initialKarma: number = member.karma;
  // Step 4: Delete the post as the author
  await api.functional.community.member.posts.erase(memberConnection, {
    postId: post.id,
  });
  // Step 5: Verify deletion succeeded by checking that subsequent access fails
  // The post should return 410 Gone or 404 Not Found after deletion
  await TestValidator.error("post should be deleted", async () => {
    // Attempting to delete an already deleted post should fail
    await api.functional.community.member.posts.erase(memberConnection, {
      postId: post.id,
    });
  });
}
