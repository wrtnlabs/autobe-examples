import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditCommunityMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const { member, postId, body } = props;

  // Verify post existence and not soft deleted
  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
  });
  if (post === null) {
    throw new HttpException("Post not found", 404);
  }

  const whereCondition = {
    deleted_at: null,
    reddit_community_post_id: postId,
    ...(body.author_member_id !== undefined &&
      body.author_member_id !== null && {
        author_member_id: body.author_member_id,
      }),
    ...(body.author_guest_id !== undefined &&
      body.author_guest_id !== null && {
        author_guest_id: body.author_guest_id,
      }),
    ...(body.parent_comment_id !== undefined &&
      body.parent_comment_id !== null && {
        parent_comment_id: body.parent_comment_id,
      }),
    ...(body.body_text !== undefined &&
      body.body_text !== null && {
        body_text: { contains: body.body_text },
      }),
  };

  const pageNum = body.page ?? 1;
  const limitNum = body.limit ?? 10;
  const skipNum = (pageNum - 1) * limitNum;

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where: whereCondition,
      select: {
        id: true,
        body_text: true,
        author_member_id: true,
        author_guest_id: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skipNum,
      take: limitNum,
    }),
    MyGlobal.prisma.reddit_community_comments.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(pageNum),
      limit: Number(limitNum),
      records: total,
      pages: Math.ceil(total / limitNum),
    },
    data: comments.map((item) => ({
      id: item.id,
      body_text: item.body_text,
      author_member_id: item.author_member_id ?? undefined,
      author_guest_id: item.author_guest_id ?? undefined,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
  };
}
