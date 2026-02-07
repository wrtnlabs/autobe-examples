import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentAtSummaryTransformer } from "../transformers/CommunityPlatformCommentAtSummaryTransformer";
import { CommunityPlatformCommentTransformer } from "../transformers/CommunityPlatformCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommentsCommentIdThread(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment> {
  const root = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId, deleted_at: null },
    ...CommunityPlatformCommentTransformer.select(),
  });
  if (!root) throw new HttpException("Comment not found", 404);
  const children = await getDescendantComments(root.id);
  return {
    id: root.id,
    content: root.content,
    created_at: toISOStringSafe(root.created_at),
    updated_at: toISOStringSafe(root.updated_at),
    deleted_at: root.deleted_at ? toISOStringSafe(root.deleted_at) : null,
    member: await CommunityPlatformCommentAtSummaryTransformer.transform(
      root.member,
    ),
    parent: root.parent
      ? await CommunityPlatformCommentAtSummaryTransformer.transform(
          root.parent,
        )
      : null,
    children,
  };
  async function getDescendantComments(
    parentId: string,
  ): Promise<ICommunityPlatformComment[]> {
    const comments = await MyGlobal.prisma.community_platform_comments.findMany(
      {
        where: { parent_id: parentId, deleted_at: null },
        orderBy: { created_at: "asc" },
        ...CommunityPlatformCommentTransformer.select(),
      },
    );
    if (comments.length === 0) return [];
    const tree = await ArrayUtil.asyncMap(
      comments,
      async (comment): Promise<ICommunityPlatformComment> => {
        const desc = await getDescendantComments(comment.id);
        return {
          id: comment.id,
          content: comment.content,
          created_at: toISOStringSafe(comment.created_at),
          updated_at: toISOStringSafe(comment.updated_at),
          deleted_at: comment.deleted_at
            ? toISOStringSafe(comment.deleted_at)
            : null,
          member: await CommunityPlatformCommentAtSummaryTransformer.transform(
            comment.member,
          ),
          parent: comment.parent
            ? await CommunityPlatformCommentAtSummaryTransformer.transform(
                comment.parent,
              )
            : null,
          children: desc,
        };
      },
    );
    return tree;
  }
}
