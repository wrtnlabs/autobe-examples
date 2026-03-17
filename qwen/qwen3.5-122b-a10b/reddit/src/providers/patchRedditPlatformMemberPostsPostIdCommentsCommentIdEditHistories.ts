import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommentEdit";
import { IRedditPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentEdit";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPostsPostIdCommentsCommentIdEditHistories(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommentEdit.IRequest;
}): Promise<IPageIRedditPlatformCommentEdit.ISummary> {
  // Verify comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.reddit_platform_comments.findFirst({
    where: {
      id: props.commentId,
      reddit_platform_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_platform_member_id: true,
      post: {
        select: {
          community_id: true,
        },
      },
    },
  });
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Check authorization: member must be comment author OR community moderator
  const isAuthor = comment.reddit_platform_member_id === props.member.id;
  let isModerator = false;
  if (!isAuthor) {
    const moderator =
      await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
        where: {
          reddit_platform_member_id: props.member.id,
          reddit_platform_community_id: comment.post.community_id,
          deleted_at: null,
        },
      });
    isModerator = !!moderator;
  }
  if (!isAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Build pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build sort parameters
  const sort = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  // Validate sort field
  const validSortFields = ["created_at"];
  if (!validSortFields.includes(sort)) {
    throw new HttpException("Invalid sort field", 400);
  }
  // Build orderBy input
  const orderByInput = {
    [sort]: order,
  } satisfies Prisma.reddit_platform_comment_editsOrderByWithRelationInput;
  // Query edit histories with pagination
  const [edits, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_comment_edits.findMany({
      where: {
        reddit_platform_comment_id: props.commentId,
      },
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        old_content: true,
        new_content: true,
        created_at: true,
        member: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatarFile: {
              select: {
                id: true,
              },
            },
            karma_score: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_platform_comment_edits.count({
      where: {
        reddit_platform_comment_id: props.commentId,
      },
    }),
  ]);
  // Transform results
  const data = await ArrayUtil.asyncMap(edits, async (edit) => {
    const author: IRedditPlatformMember.ISummary = {
      id: edit.member.id,
      username: edit.member.username,
      display_name: edit.member.display_name ?? undefined,
      avatar_file_id: edit.member.avatarFile?.id ?? undefined,
      karma_score: edit.member.karma_score,
      created_at: toISOStringSafe(edit.member.created_at),
    } satisfies IRedditPlatformMember.ISummary;
    const summary: IRedditPlatformCommentEdit.ISummary = {
      id: edit.id,
      old_content: edit.old_content,
      new_content: edit.new_content,
      author: author,
      created_at: toISOStringSafe(edit.created_at),
    } satisfies IRedditPlatformCommentEdit.ISummary;
    return summary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIRedditPlatformCommentEdit.ISummary;
}
