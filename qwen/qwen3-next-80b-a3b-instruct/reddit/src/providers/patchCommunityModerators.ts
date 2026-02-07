import { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityModerators(props: {
  body: ICommunityModerator.IRequest;
}): Promise<IPageICommunityModerator.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.community_moderatorsWhereInput = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.community_moderators.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      display_name: true,
      email: true,
      email_verified: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_moderators.count({
    where: whereInput,
  });
  const transformedData = data.map((moderator) => ({
    id: moderator.id,
    display_name: moderator.display_name ?? undefined,
    email: moderator.email,
    email_verified: moderator.email_verified,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
