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

export async function test_api_comment_update_author_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: undefined,
  });
  typia.assert(memberAuth);
  // Create a post (SDK type says void, but runtime may return created entity).
  // We capture it as unknown and assert the expected DTO.
  const postUnknown =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          community_id: typia.random<string & tags.Format<"uuid">>(),
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body_text: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  const post = typia.assert(
    postUnknown as unknown as ICommunityPlatformPost.ISummary,
  );
  const originalCommentUnknown =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          bodyText: RandomGenerator.name(),
          parentCommentId: undefined,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  const originalComment = typia.assert(
    originalCommentUnknown as unknown as ICommunityPlatformPostVoteComment & {
      id: string & tags.Format<"uuid">;
    },
  );
  const newBodyText = RandomGenerator.name();
  const updatedUnknown =
    await api.functional.communityPlatform.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: originalComment.id,
        body: {
          bodyText: newBodyText,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  const updated = typia.assert(
    updatedUnknown as unknown as ICommunityPlatformComment,
  );
  TestValidator.equals("comment id matches", updated.id, originalComment.id);
  TestValidator.equals(
    "post id still matches",
    updated.community_platform_post_id,
    post.id,
  );
  TestValidator.equals("body_text updated", updated.body_text, newBodyText);
  TestValidator.predicate(
    "updated_at is later",
    new Date(updated.updated_at).getTime() >
      new Date(originalComment.updatedAt).getTime(),
  );
  const memberId = memberAuth.id;
  TestValidator.predicate(
    "edited_by_id is either null or equals the author",
    updated.edited_by_id === null || updated.edited_by_id === memberId,
  );
}
