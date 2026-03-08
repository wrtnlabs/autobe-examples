import { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberSessionAtSummaryTransformer } from "../transformers/CommunityPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberSessions(props: {
  member: MemberPayload;
  body: ICommunityPlatformMemberSession.IRequest;
}): Promise<IPageICommunityPlatformMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput = {
    community_platform_member_id: props.member.id,
    ...(props.body.status !== null &&
      props.body.status !== undefined && {
        ...(props.body.status === "active" && {
          expired_at: { gt: now },
          deleted_at: null,
        }),
        ...(props.body.status === "expired" && {
          expired_at: { lte: now },
          deleted_at: null,
        }),
        ...(props.body.status === "terminated" && {
          deleted_at: { not: null },
        }),
      }),
    ...(props.body.search && {
      OR: [
        {
          user_agent: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        { ip: { contains: props.body.search, mode: "insensitive" as const } },
      ],
    }),
    ...(props.body.createdFrom && {
      created_at: { gte: new Date(props.body.createdFrom) },
    }),
    ...(props.body.createdTo && {
      created_at: { lte: new Date(props.body.createdTo) },
    }),
  } satisfies Prisma.community_platform_member_sessionsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_member_sessions.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
