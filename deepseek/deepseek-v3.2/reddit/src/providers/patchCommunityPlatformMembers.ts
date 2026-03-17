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
import { CommunityPlatformMemberAtSummaryTransformer } from "../transformers/CommunityPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMembers(props: {
  body: ICommunityPlatformMember.IRequest;
}): Promise<IPageICommunityPlatformMember.ISummary> {
  // Default pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereInput = {
    deleted_at: null, // Don't include soft-deleted members
    ...(props.body.email && { email: props.body.email }),
    ...(props.body.username && {
      username: { contains: props.body.username, mode: "insensitive" as const },
    }),
    ...(props.body.nickname && {
      nickname: { contains: props.body.nickname, mode: "insensitive" as const },
    }),
    ...(props.body.email_verified !== undefined && {
      email_verified: props.body.email_verified,
    }),
    ...(props.body.registered_at_min && {
      registered_at: { gte: new Date(props.body.registered_at_min) },
    }),
    ...(props.body.registered_at_max && {
      registered_at: { lte: new Date(props.body.registered_at_max) },
    }),
    ...(props.body.last_login_at_min && {
      last_login_at: {
        gte: new Date(props.body.last_login_at_min),
        not: null,
      },
    }),
    ...(props.body.last_login_at_max && {
      last_login_at: {
        lte: new Date(props.body.last_login_at_max),
        not: null,
      },
    }),
  } satisfies Prisma.community_platform_membersWhereInput;
  // Determine sort order
  const order =
    props.body.order ?? (props.body.sort === "username" ? "asc" : "desc");
  const orderByInput = (
    props.body.sort === "last_login_at"
      ? { last_login_at: order as "asc" | "desc" }
      : props.body.sort === "username"
        ? { username: order as "asc" | "desc" }
        : { registered_at: order as "asc" | "desc" }
  ) satisfies Prisma.community_platform_membersOrderByWithRelationInput;
  // Execute queries
  const data = await MyGlobal.prisma.community_platform_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_members.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformMemberAtSummaryTransformer.transform,
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
