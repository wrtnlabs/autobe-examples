import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMembers(props: {
  body: IRedditPlatformMember.IRequest;
}): Promise<IPageIRedditPlatformMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_membersWhereInput = {
    deleted_at: null,
    ...(props.body.username && {
      username: { contains: props.body.username, mode: "insensitive" as const },
    }),
    ...(props.body.display_name && {
      display_name: {
        contains: props.body.display_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.karma_min !== undefined && {
      karma_score: { gte: props.body.karma_min },
    }),
    ...(props.body.karma_max !== undefined && {
      karma_score: { lte: props.body.karma_max },
    }),
    ...(props.body.created_from && {
      created_at: { gte: new Date(props.body.created_from) },
    }),
    ...(props.body.created_to && {
      created_at: { lte: new Date(props.body.created_to) },
    }),
  } satisfies Prisma.reddit_platform_membersWhereInput;
  const orderByInput: Prisma.reddit_platform_membersOrderByWithRelationInput = (
    props.body.sort_by === "karma_score"
      ? { karma_score: props.body.sort_order === "asc" ? "asc" : "desc" }
      : props.body.sort_by === "created_at"
        ? { created_at: props.body.sort_order === "asc" ? "asc" : "desc" }
        : props.body.sort_by === "username"
          ? { username: props.body.sort_order === "asc" ? "asc" : "desc" }
          : props.body.sort_by === "is_active"
            ? { is_active: props.body.sort_order === "asc" ? "asc" : "desc" }
            : { created_at: "desc" }
  ) satisfies Prisma.reddit_platform_membersOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_members.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        display_name: true,
        karma_score: true,
        is_active: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_platform_members.count({ where: whereInput }),
  ]);
  const mappedData: IRedditPlatformMember.ISummary[] = data.map((member) => ({
    id: member.id,
    username: member.username,
    display_name: member.display_name,
    karma_score: member.karma_score,
    is_active: member.is_active,
    created_at: member.created_at.toISOString(),
  }));
  return {
    data: mappedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
