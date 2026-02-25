import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { ICommunityPlatformPostVoteOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformPostVoteOfModeratorCollector } from "../collectors/CommunityPlatformPostVoteOfModeratorCollector";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostVoteOfModeratorTransformer } from "../transformers/CommunityPlatformPostVoteOfModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformModeratorPostVotesModerators(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformPostVoteOfModerator.ICreate;
}): Promise<ICommunityPlatformPostVoteOfModerator> {
  // Validate existence of the referenced post vote
  await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
    where: { id: props.body.communityPlatformPostVoteId },
  });
  // Check for duplicate vote by the same moderator on the same post vote
  const existingVote =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.findFirst({
      where: {
        community_platform_moderator_id:
          props.body.communityPlatformModeratorId,
        community_platform_post_vote_id: props.body.communityPlatformPostVoteId,
      },
    });
  if (existingVote) {
    throw new HttpException("Duplicate vote is not allowed", 409);
  }
  // Collect data for insertion from props.body
  const data = await CommunityPlatformPostVoteOfModeratorCollector.collect({
    body: props.body,
  });
  // Create new moderator post vote
  const created =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.create({
      data,
      ...CommunityPlatformPostVoteOfModeratorTransformer.select(),
    });
  // Transform and return created record
  return await CommunityPlatformPostVoteOfModeratorTransformer.transform(
    created,
  );
}
