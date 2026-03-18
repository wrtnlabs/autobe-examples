import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingMember";
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

export async function patchErpHrmTimeTrackingMemberMembers(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingMember.IRequest;
}): Promise<IPageIErpHrmTimeTrackingMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  if (page < 1) throw new HttpException("page must be >= 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException("limit must be between 1 and 100", 400);
  const search = props.body.search?.trim();
  const canView = await (
    MyGlobal.prisma as any
  ).organization_permissions?.findFirst?.({
    where: {
      member_id: props.member.id,
      can_view_members: true,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!canView) throw new HttpException("Forbidden", 403);
  const organizationId = (props.member as any).organization_id as string &
    tags.Format<"uuid">;
  const where = {
    deleted_at: null,
    ...(organizationId
      ? { erp_hrm_time_tracking_members: { organization_id: organizationId } }
      : {}),
    ...(search
      ? { email: { contains: search, mode: "insensitive" as const } }
      : {}),
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_members.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy:
        props.body.sortBy === "email"
          ? { email: props.body.sortOrder ?? "asc" }
          : { created_at: "desc" },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_members.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      email: r.email,
      created_at: r.created_at.toISOString() as any,
      updated_at: r.updated_at.toISOString() as any,
      deleted_at: r.deleted_at ? (r.deleted_at.toISOString() as any) : null,
    })),
  };
}
