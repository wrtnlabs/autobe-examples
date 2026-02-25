import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfUser";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommentVoteOfUserTransformer } from "../transformers/CommunityPlatformCommentVoteOfUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserCommentVotesUsersCommentVoteId(props: {
  user: UserPayload;
  commentVoteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommentVoteOfUser.IUpdate;
}): Promise<ICommunityPlatformCommentVoteOfUser> {
  const existingVote =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.findUniqueOrThrow(
      {
        where: { id: props.commentVoteId },
        select: { id: true, community_platform_user_id: true },
      },
    );
  if (existingVote.community_platform_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  const currentISODateTime = new Date().toISOString() as string &
    tags.Format<"date-time">;
  await MyGlobal.prisma.community_platform_comment_vote_of_users.update({
    where: { id: props.commentVoteId },
    data: { vote_type: props.body.vote_type, updated_at: currentISODateTime },
  });
  const updatedVote =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.findUniqueOrThrow(
      {
        where: { id: props.commentVoteId },
        ...CommunityPlatformCommentVoteOfUserTransformer.select(),
      },
    );
  return await CommunityPlatformCommentVoteOfUserTransformer.transform(
    updatedVote,
  );
}
