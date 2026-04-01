import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeInvitation";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeEmployeeInvitation";
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

export async function patchErpHrmTimeMemberEmployeesInvitations(props: {
  member: MemberPayload;
  body: IErpHrmTimeEmployeeInvitation.IRequest;
}): Promise<IPageIErpHrmTimeEmployeeInvitation.ISummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          is_selected_context: true,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_member_email_verificationsWhereInput = {
    deleted_at: null,
    member: {
      deleted_at: null,
      organizationMemberships: {
        some: {
          erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
          deleted_at: null,
        },
      },
    },
    ...(props.body.email !== undefined
      ? {
          member: {
            email: props.body.email,
            deleted_at: null,
            organizationMemberships: {
              some: {
                erp_hrm_time_organization_id:
                  membership.erp_hrm_time_organization_id,
                deleted_at: null,
              },
            },
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            {
              member: {
                email: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };
  const orderedBy =
    props.body.sort === "email"
      ? ({
          member: { email: props.body.direction ?? "asc" },
        } satisfies Prisma.erp_hrm_time_member_email_verificationsOrderByWithRelationInput)
      : props.body.sort === "status"
        ? ({
            verified_at: props.body.direction ?? "desc",
          } satisfies Prisma.erp_hrm_time_member_email_verificationsOrderByWithRelationInput)
        : ({
            created_at: props.body.direction ?? "desc",
          } satisfies Prisma.erp_hrm_time_member_email_verificationsOrderByWithRelationInput);
  const data =
    await MyGlobal.prisma.erp_hrm_time_member_email_verifications.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderedBy,
      select: {
        id: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_image_url: true,
            phone_number: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.erp_hrm_time_member_email_verifications.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map(
      (record) =>
        ({
          id: record.id,
          email: record.member.email,
          status:
            record.deleted_at !== null
              ? "cancelled"
              : record.verified_at !== null
                ? "accepted"
                : record.expires_at.toISOString() <= new Date().toISOString()
                  ? "expired"
                  : "pending",
          member: {
            id: record.member.id,
          } satisfies IErpHrmTimeMember.ISummary,
          createdAt: record.created_at.toISOString(),
          updatedAt: record.updated_at.toISOString(),
        }) satisfies IErpHrmTimeEmployeeInvitation.ISummary,
    ),
  };
}
