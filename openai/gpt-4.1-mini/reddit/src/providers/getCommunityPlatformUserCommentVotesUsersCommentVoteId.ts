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

export async function getCommunityPlatformUserCommentVotesUsersCommentVoteId(props: {
  user: UserPayload;
  commentVoteId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentVoteOfUser> {
  // Retrieve the vote record by primary key with full selection including nested relations
  const voteRecord =
    await MyGlobal.prisma.community_platform_comment_vote_of_users.findUniqueOrThrow(
      {
        where: { id: props.commentVoteId },
        ...CommunityPlatformCommentVoteOfUserTransformer.select(),
      },
    );
  // Authorization check: only the owner user can access the vote details
  if (voteRecord.community_platform_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Transform the Prisma record into the response DTO
  const transformed =
    await CommunityPlatformCommentVoteOfUserTransformer.transform(voteRecord);
  return transformed;
}
