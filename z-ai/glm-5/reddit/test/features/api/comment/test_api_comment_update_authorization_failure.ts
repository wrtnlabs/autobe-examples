import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_update_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate Member A (the comment owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // Step 2: Create a community as Member A
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create a post in the community as Member A
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // Step 4: Create a comment on the post as Member A (this is the target comment)
  const originalComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(originalComment);
  // Store original content for comparison
  const originalContent = originalComment.content;
  // Step 5: Create and authenticate Member B (a different member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // Verify Member A and Member B are different users
  TestValidator.notEquals(
    "members are different users",
    memberA.id,
    memberB.id,
  );
  // Step 6: Attempt to update Member A's comment using Member B's authentication
  // This should fail because Member B is not the comment author
  await TestValidator.error("unauthorized comment update", async () => {
    await api.functional.communityPlatform.member.posts.comments.update(
      memberBConnection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  });
}
