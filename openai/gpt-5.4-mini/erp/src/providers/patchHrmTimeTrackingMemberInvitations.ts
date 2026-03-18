import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingInvitation";
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

export async function patchHrmTimeTrackingMemberInvitations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingInvitation.IRequest;
}): Promise<IPageIHrmTimeTrackingInvitation.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.hrm_time_tracking_invitationsWhereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined && { email: props.body.email }),
    ...(props.body.status !== undefined && { status: props.body.status }),
  };
  const records: number =
    await MyGlobal.prisma.hrm_time_tracking_invitations.count({
      where,
    });
  const rows = await MyGlobal.prisma.hrm_time_tracking_invitations.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      email: true,
      status: true,
      expires_at: true,
      accepted_at: true,
      revoked_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_image_url: true,
          currency: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      userAccount: {
        select: {},
      },
      invitedByMember: {
        select: {
          id: true,
          email: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: rows.map(
      (row): IHrmTimeTrackingInvitation.ISummary => ({
        id: row.id,
        organization: {
          id: row.organization.id,
          name: row.organization.name,
          description: row.organization.description,
          logoImageUrl: row.organization.logo_image_url,
          currency: row.organization.currency,
          timezone: row.organization.timezone,
          fiscalStartMonth: row.organization.fiscal_start_month,
          createdAt: row.organization.created_at.toISOString(),
          updatedAt: row.organization.updated_at.toISOString(),
          deletedAt:
            row.organization.deleted_at === null
              ? null
              : row.organization.deleted_at.toISOString(),
        },
        userAccount: null,
        invitedByMember:
          row.invitedByMember === null
            ? null
            : {
                id: row.invitedByMember.id,
                email: row.invitedByMember.email,
                is_active: row.invitedByMember.is_active,
                last_login_at:
                  row.invitedByMember.last_login_at === null
                    ? null
                    : row.invitedByMember.last_login_at.toISOString(),
                created_at: row.invitedByMember.created_at.toISOString(),
                updated_at: row.invitedByMember.updated_at.toISOString(),
                deleted_at:
                  row.invitedByMember.deleted_at === null
                    ? null
                    : row.invitedByMember.deleted_at.toISOString(),
              },
        email: row.email,
        status: row.status,
        expiresAt: row.expires_at.toISOString(),
        acceptedAt:
          row.accepted_at === null ? null : row.accepted_at.toISOString(),
        revokedAt:
          row.revoked_at === null ? null : row.revoked_at.toISOString(),
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        deletedAt:
          row.deleted_at === null ? null : row.deleted_at.toISOString(),
      }),
    ),
  };
}
