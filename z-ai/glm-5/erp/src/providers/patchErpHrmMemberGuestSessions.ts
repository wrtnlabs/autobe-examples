import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmGuestSessionAtSummaryTransformer } from "../transformers/ErpHrmGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberGuestSessions(props: {
  member: MemberPayload;
  body: IErpHrmGuestSession.IRequest;
}): Promise<IPageIErpHrmGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    guest: {
      deleted_at: null,
    },
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
    ...((props.body.from !== undefined || props.body.to !== undefined) && {
      created_at: {
        ...(props.body.from !== undefined && {
          gte: new Date(props.body.from),
        }),
        ...(props.body.to !== undefined && { lte: new Date(props.body.to) }),
      },
    }),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { lt: new Date() } : { gte: new Date() },
    }),
  } satisfies Prisma.erp_hrm_guest_sessionsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_guest_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmGuestSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
