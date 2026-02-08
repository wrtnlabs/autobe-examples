import { ICommunityPlatformPostVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUsers";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostVoteOfUsers } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUsers";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPostVotesUsers(props: {
  user: UserPayload;
  body: ICommunityPlatformPostVoteOfUsers.IRequest;
}): Promise<IPageICommunityPlatformPostVoteOfUsers.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.community_platform_post_vote_of_users.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      where: { deleted_at: null },
    });
  const total =
    await MyGlobal.prisma.community_platform_post_vote_of_users.count({
      where: { deleted_at: null },
    });
  return {
    data: data.map(() => ({})),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
