import { ICommunityPlatformPostVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfModerators";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteOfModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfModerators";
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

export async function patchCommunityPlatformModeratorPostVotesModerators(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformPostVoteOfModerators.IRequest;
}): Promise<IPageICommunityPlatformPostVoteOfModerators.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.findMany({
      where: { deleted_at: null },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.community_platform_post_vote_of_moderators.count({
      where: { deleted_at: null },
    });
  const pageData: ICommunityPlatformPostVoteOfModerators.ISummary[] = data.map(
    () => ({}),
  );
  return {
    data: pageData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
