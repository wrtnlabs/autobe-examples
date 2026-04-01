import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformMemberSessionAtSummaryTransformer } from "../transformers/HrmPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberSessions(props: {
  member: MemberPayload;
  body: IHrmPlatformMemberSession.IRequest;
}): Promise<IPageIHrmPlatformMemberSession.ISummary> {
  const page = Math.max(props.body.page ?? 1, 1);
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput: Prisma.hrm_platform_member_sessionsWhereInput = {
    hrm_platform_member_id: props.member.id,
    ...(props.body.dateRange?.start && {
      created_at: {
        gte: new Date(props.body.dateRange.start),
      },
    }),
    ...(props.body.dateRange?.end && {
      created_at: {
        lte: new Date(props.body.dateRange.end),
      },
    }),
    ...(props.body.ipPattern && {
      ip: {
        contains: props.body.ipPattern,
      },
    }),
    ...(props.body.status === "active" && {
      expired_at: {
        gt: now,
      },
    }),
    ...(props.body.status === "expired" && {
      expired_at: {
        lte: now,
      },
    }),
  } satisfies Prisma.hrm_platform_member_sessionsWhereInput;
  const validSortFields = ["created_at", "expired_at", "ip"] as const;
  const sortField =
    props.body.sort && validSortFields.includes(props.body.sort as any)
      ? (props.body
          .sort as keyof Prisma.hrm_platform_member_sessionsOrderByWithRelationInput)
      : "created_at";
  const orderByInput: Prisma.hrm_platform_member_sessionsOrderByWithRelationInput =
    {
      [sortField]: props.body.order ?? "desc",
    } satisfies Prisma.hrm_platform_member_sessionsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.hrm_platform_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...HrmPlatformMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_platform_member_sessions.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
