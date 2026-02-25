import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate regular user (comment author)
  const regularUserConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_user_join(regularUserConnection, {});
  typia.assert(regularUser);
  // 2. Create and authenticate moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorUser = await authorize_user_join(moderatorConnection, {});
  typia.assert(moderatorUser);
  // 3. Moderator creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 4. Moderator assigns themselves as moderator of the community
  const moderatorAssignment =
    await generate_random_community_platform_user_communities_moderators_create(
      moderatorConnection,
      {
        params: { communityId: community.id },
        body: {
          user_id: moderatorUser.id satisfies string & tags.Format<"uuid">,
          role_level: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Regular user creates a post in the community
  const post = await generate_random_community_platform_user_posts_create(
    regularUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Regular user creates a comment on the post
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      regularUserConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Moderator deletes the comment (different user, has moderator privileges)
  await api.functional.communityPlatform.user.posts.comments.erase(
    moderatorConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 8. Validate deletion succeeded (void response - no error means success)
  // No additional validation needed as void response indicates successful deletion
  // 9. Test authorization: Verify moderator can delete comment they didn't create
  // This is implicit in the successful deletion above
  // 10. Cascade deletion of voting records not implemented in current schema
  // Comment: The scenario mentions verifying cascade deletion but current
  // DTOs don't provide endpoints to query comment existence after deletion
}
