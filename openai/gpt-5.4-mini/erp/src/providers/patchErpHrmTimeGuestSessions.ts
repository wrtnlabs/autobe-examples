import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeGuestSessions(props: {
  guest: GuestPayload;
  body: IErpHrmTimeMemberSession.IRequest;
}): Promise<IPageIErpHrmTimeMemberSession.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const offset: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const orderBy: Prisma.erp_hrm_time_member_sessionsOrderByWithRelationInput =
    props.body.sort === undefined
      ? { created_at: "desc" }
      : props.body.sort === "created_at"
        ? { created_at: props.body.order ?? "desc" }
        : props.body.sort === "ip"
          ? { ip: props.body.order ?? "desc" }
          : props.body.sort === "href"
            ? { href: props.body.order ?? "desc" }
            : { referrer: props.body.order ?? "desc" };
  const where: Prisma.erp_hrm_time_member_sessionsWhereInput = {
    member: {
      id: props.guest.session_id,
    },
    ...(search === undefined
      ? {}
      : {
          OR: [
            { ip: { contains: search, mode: "insensitive" } },
            { href: { contains: search, mode: "insensitive" } },
            { referrer: { contains: search, mode: "insensitive" } },
          ],
        }),
  };
  const total: number =
    await MyGlobal.prisma.erp_hrm_time_member_sessions.count({ where });
  const rows = await MyGlobal.prisma.erp_hrm_time_member_sessions.findMany({
    where,
    skip: offset,
    take: limit,
    orderBy,
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      member: true,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(rows, async (row) => ({
      id: row.id,
      member: {
        id: row.member.id,
      } as IErpHrmTimeMember.ISummary,
      ip: row.ip,
      href: row.href,
      referrer: row.referrer,
      createdAt: toISOStringSafe(row.created_at),
      expiredAt: toISOStringSafe(row.expired_at),
    })),
  };
}
