import { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { CommunityMemberSessionAtSummaryTransformer } from "../transformers/CommunityMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityGuestSessions(props: {
  guest: GuestPayload;
  body: ICommunityMemberSession.IRequest;
}): Promise<IPageICommunityMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const createdAtFilter:
    | Prisma.DateTimeFilter<"community_member_sessions">
    | undefined =
    props.body.createdAtFrom != null || props.body.createdAtTo != null
      ? {
          ...(props.body.createdAtFrom != null && {
            gte: new Date(props.body.createdAtFrom),
          }),
          ...(props.body.createdAtTo != null && {
            lte: new Date(props.body.createdAtTo),
          }),
        }
      : undefined;
  const expiredAtFilter:
    | Prisma.DateTimeFilter<"community_member_sessions">
    | undefined = (() => {
    if (props.body.active === true) {
      return { gt: now };
    }
    if (props.body.active === false) {
      return { lte: now };
    }
    if (props.body.expiredAtFrom != null || props.body.expiredAtTo != null) {
      return {
        ...(props.body.expiredAtFrom != null && {
          gte: new Date(props.body.expiredAtFrom),
        }),
        ...(props.body.expiredAtTo != null && {
          lte: new Date(props.body.expiredAtTo),
        }),
      };
    }
    return undefined;
  })();
  const whereInput = {
    ...(props.body.ip != null && {
      ip: { contains: props.body.ip, mode: "insensitive" as const },
    }),
    ...(props.body.href != null && {
      href: { contains: props.body.href, mode: "insensitive" as const },
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
    ...(expiredAtFilter !== undefined && { expired_at: expiredAtFilter }),
  } satisfies Prisma.community_member_sessionsWhereInput;
  const data = await MyGlobal.prisma.community_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...CommunityMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
