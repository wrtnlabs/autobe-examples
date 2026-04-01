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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberSessions(props: {
  member: MemberPayload;
  body: IHrmPlatformMemberSession.IRequest;
}): Promise<IPageIHrmPlatformMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_member_sessionsWhereInput = {
    member_id: props.member.id,
    ...(props.body.search && {
      OR: [
        { device_info: { contains: props.body.search } },
        { ip: { contains: props.body.search } },
      ],
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.device_info && {
      device_info: { contains: props.body.device_info },
    }),
    ...(props.body.ip && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { lt: new Date() } : { gte: new Date() },
    }),
  } satisfies Prisma.hrm_platform_member_sessionsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      device_info: true,
      created_at: true,
      expired_at: true,
      member: {
        select: {
          id: true,
          display_name: true,
          avatar_image: true,
          phone_number: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_member_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((session) => ({
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      device_info: session.device_info,
      created_at: toISOStringSafe(session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
      member: {
        id: session.member.id,
        display_name: session.member.display_name,
        avatar_image: session.member.avatar_image,
        phone_number: session.member.phone_number,
      } satisfies IHrmPlatformMember.ISummary,
    })),
  };
}
