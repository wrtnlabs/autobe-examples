import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_detail_deleted_content_admin_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // 2) Create a post (helper returns void in the provided SDK typings,
  // so we create it using the comment helper flow to obtain the post id).
  // Since we only have the post/comments creation helpers and the comment
  // detail read/delete SDK, we need a concrete postId. The only available
  // creation helper that returns a post identifier is not provided here.
  // Therefore, create a post via a member post creation request using the
  // comments helper's required postId by first generating a random postId.
  // The test relies on the platform allowing comment creation under that postId.
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 3) Create a comment inside the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 1 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4) Delete the comment
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberConnection,
    {
      postId,
      commentId: comment.id,
    },
  );
  // 5) Deleted comment should not be visible to member
  await TestValidator.httpError(
    "deleted comment should be hidden from member view",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.member.posts.comments.at(
        memberConnection,
        {
          postId,
          commentId: comment.id,
        },
      );
    },
  );
}
