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
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  const whereInput = {
    community_platform_member_id: props.member.id,
    ...(props.body.search !== undefined && {
      OR: [
        { ip: { contains: props.body.search } },
        { href: { contains: props.body.search } },
        { referrer: { contains: props.body.search } },
      ],
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.href !== undefined && {
      href: { contains: props.body.href },
    }),
    ...(props.body.referrer !== undefined && {
      referrer: { contains: props.body.referrer },
    }),
    ...((props.body.created_from !== undefined ||
      props.body.created_to !== undefined) && {
      created_at: {
        ...(props.body.created_from !== undefined && {
          gte: new Date(props.body.created_from),
        }),
        ...(props.body.created_to !== undefined && {
          lte: new Date(props.body.created_to),
        }),
      },
    }),
    ...(props.body.is_active === true && {
      expired_at: { gt: now },
    }),
    ...(props.body.is_active === false && {
      expired_at: { lte: now },
    }),
  } satisfies Prisma.community_platform_member_sessionsWhereInput;
  const orderByInput: Prisma.community_platform_member_sessionsOrderByWithRelationInput[] =
    props.body.sort === "created_at"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "expired_at"
        ? [{ expired_at: "asc" }, { id: "asc" }]
        : props.body.sort === "-expired_at"
          ? [{ expired_at: "desc" }, { id: "desc" }]
          : [{ created_at: "desc" }, { id: "desc" }];
  const data =
    await MyGlobal.prisma.community_platform_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformMemberSessionAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
