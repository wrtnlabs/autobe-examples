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
 * Test that deleted comments cannot be edited.
 *
 * This test verifies that the system properly enforces the soft-deletion
 * restriction on comment editing. When a comment has been soft-deleted,
 * any attempt to edit it should be rejected with an appropriate error.
 */
export async function test_api_comment_update_deleted_comment_restriction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  await api.functional.community.member.communities.subscribe(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  // 4. Create a post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: {
        communityName: community.name,
      },
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const comment = await generate_random_community_member_posts_comments_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(comment);
  // Verify comment is not deleted initially
  TestValidator.predicate(
    "Comment should not be deleted initially",
    comment.isDeleted === false,
  );
  // 6. Delete the comment (soft delete)
  await api.functional.community.member.comments.erase(memberConnection, {
    commentId: comment.id,
  });
  // 7. Attempt to edit the deleted comment - should fail with error
  await TestValidator.error("Editing deleted comment should fail", async () => {
    await api.functional.community.member.comments.update(memberConnection, {
      commentId: comment.id,
      body: {
        content: "This is an attempt to edit a deleted comment",
      } satisfies ICommunityComment.IUpdate,
    });
  });
}
