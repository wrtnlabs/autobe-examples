import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityComment> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  let depth = 0;
  if (props.body.parent_comment_id) {
    const parentComment =
      await MyGlobal.prisma.reddit_community_comments.findUnique({
        where: { id: props.body.parent_comment_id },
      });

    if (!parentComment) {
      throw new HttpException("Parent comment not found", 404);
    }

    if (parentComment.reddit_community_post_id !== props.postId) {
      throw new HttpException(
        "Parent comment does not belong to this post",
        400,
      );
    }

    depth = parentComment.depth + 1;
  }

  const created = await MyGlobal.prisma.reddit_community_comments.create({
    data: {
      id: v4(),
      body: props.body.body,
      reddit_community_post_id: props.postId,
      reddit_community_member_id: props.member.id,
      parent_comment_id: props.body.parent_comment_id ?? null,
      depth: depth,
      edited: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    body: created.body,
    reddit_community_post_id: created.reddit_community_post_id,
    reddit_community_member_id: created.reddit_community_member_id,
    parent_comment_id: created.parent_comment_id ?? null,
    depth: created.depth,
    edited: created.edited,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
