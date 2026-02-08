import { ICommunityPlatformCommentVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteOfModerators";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteOfModerators";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommentVotesModerators(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommentVoteOfModerators.IRequest;
}): Promise<IPageICommunityPlatformCommentVoteOfModerators.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_platform_comment_vote_of_moderatorsWhereInput =
    {
      deleted_at: null,
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_comment_vote_of_moderators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        comment_vote_id: true,
        moderator_id: true,
        vote: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_comment_vote_of_moderators.count({
      where: whereInput,
    }),
  ]);
  return {
    data: data.map((item) => ({
      id: item.id,
      comment_vote_id: item.comment_vote_id,
      moderator_id: item.moderator_id,
      vote: item.vote,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
