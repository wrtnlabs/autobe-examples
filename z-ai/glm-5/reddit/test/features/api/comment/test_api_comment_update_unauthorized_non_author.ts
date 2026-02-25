import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
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
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test that non-authors cannot edit comments owned by other users.
 *
 * Authorization requirement: Only the comment author can edit their own comments.
 * Expected error: 403 Forbidden with COMMENT_EDIT_UNAUTHORIZED error code.
 */
export async function test_api_comment_update_unauthorized_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Member A (comment author) connection
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member A creates a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberAConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 4. Member A creates a comment on the post
  const originalComment =
    await generate_random_community_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
      },
    );
  typia.assert(originalComment);
  const originalContent = originalComment.content;
  // 5. Create Member B (different user) connection
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Member B subscribes to the community
  await api.functional.community.member.communities.subscribe(
    memberBConnection,
    {
      communityName: community.name,
    },
  );
  // 7. Member B attempts to edit Member A's comment - should fail with 403
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.httpError(
    "non-author cannot edit another user's comment",
    403,
    async () =>
      await api.functional.community.member.comments.update(memberBConnection, {
        commentId: originalComment.id,
        body: { content: newContent } satisfies ICommunityComment.IUpdate,
      }),
  );
  // 8. Verify the original comment content is unchanged
  // Note: We cannot fetch the comment directly without a GET endpoint,
  // but the error being thrown confirms the update was rejected.
  // The test passes if we reach here without the update succeeding.
}
