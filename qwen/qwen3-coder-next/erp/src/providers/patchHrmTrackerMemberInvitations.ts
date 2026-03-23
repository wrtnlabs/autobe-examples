import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerPendingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerPendingInvitation";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerPendingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerPendingInvitation";
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

export async function patchHrmTrackerMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmTrackerPendingInvitation.IRequest;
}): Promise<IPageIHrmTrackerPendingInvitation.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const memberOrganization =
    await MyGlobal.prisma.hrm_tracker_employees.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: { organization_id: true },
    });
  if (!memberOrganization) {
    throw new HttpException("Organization not found", 404);
  }
  const where: Prisma.hrm_tracker_pending_invitationsWhereInput = {
    organization_id: memberOrganization.organization_id,
    status: props.body.status?.length ? { in: props.body.status } : undefined,
    email: props.body.email ? { contains: props.body.email } : undefined,
    invited_at:
      props.body.invited_at_range?.from || props.body.invited_at_range?.to
        ? {
            gte: props.body.invited_at_range.from
              ? new Date(props.body.invited_at_range.from)
              : undefined,
            lte: props.body.invited_at_range.to
              ? new Date(props.body.invited_at_range.to)
              : undefined,
          }
        : undefined,
  };
  const orderBy: Prisma.hrm_tracker_pending_invitationsOrderByWithRelationInput =
    props.body.sort_by === "invited_at"
      ? { invited_at: props.body.sort_order ?? "desc" }
      : props.body.sort_by === "email"
        ? { email: props.body.sort_order ?? "desc" }
        : props.body.sort_by === "status"
          ? { status: props.body.sort_order ?? "desc" }
          : { invited_at: "desc" };
  const data = await MyGlobal.prisma.hrm_tracker_pending_invitations.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      email: true,
      role_name: true,
      department_name: true,
      status: true,
      invited_at: true,
      resolved_at: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_image_uri: true,
          status: true,
          created_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.hrm_tracker_pending_invitations.count({
    where,
  });
  return {
    data: data.map(
      (inv) =>
        ({
          id: inv.id,
          email: inv.email,
          role_name: inv.role_name,
          department_name: inv.department_name,
          status: inv.status as
            | "pending"
            | "accepted"
            | "expired"
            | "cancelled",
          invited_at: inv.invited_at?.toISOString() ?? null,
          resolved_at: inv.resolved_at?.toISOString() ?? null,
          organization: {
            id: inv.organization.id,
            name: inv.organization.name,
            description: inv.organization.description,
            logo_image_uri: inv.organization.logo_image_uri,
            status: inv.organization.status as
              | "active"
              | "archived"
              | "deleted",
            created_at: inv.organization.created_at.toISOString(),
          } satisfies IHrmTrackerOrganization.ISummary,
        }) satisfies IHrmTrackerPendingInvitation.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmTrackerPendingInvitation.ISummary;
}
