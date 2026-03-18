import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { IHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmsGuestAtSummaryTransformer } from "../transformers/HrmsGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsGuestGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmsGuestSession.IRequest;
}): Promise<IPageIHrmsGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.page_size ?? props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.hrms_guest_sessionsWhereInput = {
    ...(props.body.hrms_guest_id && {
      hrms_guest_id: props.body.hrms_guest_id,
    }),
    ...(props.body.ip_address && { ip: props.body.ip_address }),
    ...(props.body.referrer_url && {
      referrer: { contains: props.body.referrer_url },
    }),
    ...(props.body.created_date_range &&
      props.body.created_date_range.length >= 2 && {
        created_at: {
          gte: new Date(props.body.created_date_range[0]),
          lte: new Date(props.body.created_date_range[1]),
        },
      }),
    ...(props.body.expired_date_range &&
      props.body.expired_date_range.length >= 2 && {
        expired_at: {
          gte: new Date(props.body.expired_date_range[0]),
          lte: new Date(props.body.expired_date_range[1]),
        },
      }),
    ...(props.body.expired_status === "expired" && {
      expired_at: { lte: new Date() },
    }),
    ...(props.body.expired_status === "non_expired" && {
      expired_at: { gt: new Date() },
    }),
  };
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const orderBy: Prisma.hrms_guest_sessionsOrderByWithRelationInput = {
    [sortField]: sortOrder,
  };
  const data = await MyGlobal.prisma.hrms_guest_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    include: { guest: HrmsGuestAtSummaryTransformer.select() },
  });
  const total = await MyGlobal.prisma.hrms_guest_sessions.count({ where });
  const transformedData = await ArrayUtil.asyncMap(data, async (session) => ({
    id: session.id,
    guest: await HrmsGuestAtSummaryTransformer.transform(session.guest),
    ip: session.ip,
    href: session.href,
    referrer: session.referrer ?? null,
    created_at: session.created_at.toISOString(),
    expired_at: session.expired_at.toISOString(),
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
