import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMembers(props: {
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  const {
    search,
    email,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = props.body;
  const currentPage = page || 1;
  const currentLimit = limit || 50;
  const skip = (currentPage - 1) * currentLimit;
  const whereInput = {
    deleted_at: null,
    ...(search && { email: { contains: search } }),
    ...(email && { email: { equals: email } }),
    ...(startDate && { created_at: { gte: startDate } }),
    ...(endDate && { created_at: { lte: endDate } }),
  };
  const data = await MyGlobal.prisma.community_platform_members.findMany({
    where: whereInput,
    skip,
    take: currentLimit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_members.count({
    where: whereInput,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      email: item.email,
      created_at: toISOStringSafe(item.created_at),
    })),
    pagination: {
      current: currentPage,
      limit: currentLimit,
      records: total,
      pages: Math.ceil(total / currentLimit),
    },
  };
}
