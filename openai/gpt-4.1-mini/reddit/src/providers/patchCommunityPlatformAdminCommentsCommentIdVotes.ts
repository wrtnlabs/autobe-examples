import { ICommunityPlatformCommentVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUsers";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommentVoteOfUsersCollector } from "../collectors/CommunityPlatformCommentVoteOfUsersCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommentsCommentIdVotes(props: {
  admin: AdminPayload;
  commentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVoteOfUsers.ICreate;
}): Promise<ICommunityPlatformCommentVoteOfUsers> {
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: { id: props.commentId },
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const existingVote =
      await tx.community_platform_comment_vote_of_users.findUnique({
        where: {
          community_platform_comment_id_community_platform_user_id: {
            community_platform_comment_id: props.commentId,
            community_platform_user_id: props.admin.id,
          },
        },
      });
    const voteType = (props.body as any).vote_type;
    if (voteType !== "upvote" && voteType !== "downvote") {
      if (existingVote) {
        await tx.community_platform_comment_vote_of_users.delete({
          where: { id: existingVote.id },
        });
      }
      return {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        community_platform_comment_id: props.commentId,
        community_platform_user_id: props.admin.id,
        vote_type: "",
        created_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        updated_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        deleted_at: null,
      };
    }
    const newVoteData =
      await CommunityPlatformCommentVoteOfUsersCollector.collect({
        body: props.body,
        comment,
        user: { id: props.admin.id },
        vote_type: voteType,
      });
    if (existingVote) {
      const updated = await tx.community_platform_comment_vote_of_users.update({
        where: { id: existingVote.id },
        data: {
          vote_type: voteType,
          updated_at: toISOStringSafe(new Date()) as string &
            tags.Format<"date-time">,
        },
      });
      return {
        id: updated.id as string & tags.Format<"uuid">,
        community_platform_comment_id: updated.community_platform_comment_id,
        community_platform_user_id: updated.community_platform_user_id,
        vote_type: updated.vote_type,
        created_at: toISOStringSafe(updated.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(updated.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at: updated.deleted_at
          ? (toISOStringSafe(updated.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      };
    } else {
      const created = await tx.community_platform_comment_vote_of_users.create({
        data: newVoteData,
      });
      return {
        id: created.id as string & tags.Format<"uuid">,
        community_platform_comment_id: created.community_platform_comment_id,
        community_platform_user_id: created.community_platform_user_id,
        vote_type: created.vote_type,
        created_at: toISOStringSafe(created.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(created.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at: created.deleted_at
          ? (toISOStringSafe(created.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      };
    }
  });
}
