import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformModeratorAtSummaryTransformer } from "../transformers/CommunityPlatformModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModerators(props: {
  body: ICommunityPlatformModerator.IRequest;
}): Promise<IPageICommunityPlatformModerator.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereCondition = {
    deleted_at: null,
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.username && {
      username: { contains: props.body.username, mode: "insensitive" },
    }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name, mode: "insensitive" },
    }),
    ...(props.body.is_active !== undefined &&
      props.body.is_active !== null && {
        is_active: props.body.is_active,
      }),
    ...(props.body.permission_level && {
      permission_level: props.body.permission_level,
    }),
  } satisfies Prisma.community_platform_moderatorsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderators.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformModeratorAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_moderators.count({
      where: whereCondition,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformModeratorAtSummaryTransformer.transform,
  );
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
