import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUser";
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
import { CommunityPlatformPostVoteOfUserTransformer } from "../transformers/CommunityPlatformPostVoteOfUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserPostVotesUsersPostVoteId(props: {
  user: UserPayload;
  postVoteId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostVoteOfUser.IUpdate;
}): Promise<ICommunityPlatformPostVoteOfUser> {
  // Step 1: Fetch existing vote with relations
  const vote =
    await MyGlobal.prisma.community_platform_post_vote_of_users.findUniqueOrThrow(
      {
        where: { id: props.postVoteId },
        ...CommunityPlatformPostVoteOfUserTransformer.select(),
      },
    );
  // Step 2: Validate user ownership
  if (vote.user.id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate vote_type
  const validVoteTypes = ["upvote", "downvote"] as const;
  if (!validVoteTypes.includes(props.body.vote_type)) {
    throw new HttpException("Invalid vote_type", 400);
  }
  // Step 4: Update vote record
  const timestamp: string & tags.Format<"date-time"> = new Date().toISOString();
  const updatedVote =
    await MyGlobal.prisma.community_platform_post_vote_of_users.update({
      where: { id: props.postVoteId },
      data: {
        vote_type: props.body.vote_type,
        updated_at: timestamp,
      },
      ...CommunityPlatformPostVoteOfUserTransformer.select(),
    });
  // Step 5: Transform and return result
  return await CommunityPlatformPostVoteOfUserTransformer.transform(
    updatedVote,
  );
}
