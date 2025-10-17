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
  const { member, postId, body } = props;

  const postExists = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });

  if (!postExists) {
    throw new HttpException("Post not found", 404);
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.reddit_community_comments.create({
    data: {
      id: v4(),
      reddit_community_post_id: postId,
      parent_comment_id: body.parent_comment_id ?? null,
      author_member_id: member.id,
      author_guest_id: null,
      body_text: body.body_text,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reddit_community_post_id: created.reddit_community_post_id,
    parent_comment_id: created.parent_comment_id ?? null,
    author_member_id: created.author_member_id ?? null,
    author_guest_id: null,
    body_text: created.body_text,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
