import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityRecord";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackingActivityRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityRecord";
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

export async function patchHrmTimeTrackingMemberActivityRecords(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingActivityRecord.IRequest;
}): Promise<IPageIHrmTimeTrackingActivityRecord.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where = {
    ...(props.body.memberId !== undefined && {
      hrm_time_tracking_member_id: props.body.memberId,
    }),
    ...(props.body.actionType !== undefined && {
      action_type: props.body.actionType,
    }),
    ...(props.body.targetEntityType !== undefined && {
      target_entity_type: props.body.targetEntityType,
    }),
    ...(props.body.targetEntityId !== undefined && {
      target_entity_id: props.body.targetEntityId,
    }),
    ...(props.body.targetEntityLabel !== undefined && {
      target_entity_label: props.body.targetEntityLabel,
    }),
    ...(props.body.details !== undefined && {
      details: { contains: props.body.details, mode: "insensitive" as const },
    }),
    ...((props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined) && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: new Date(props.body.createdAtFrom),
        }),
        ...(props.body.createdAtTo !== undefined && {
          lte: new Date(props.body.createdAtTo),
        }),
      },
    }),
  };
  const records =
    await MyGlobal.prisma.hrm_time_tracking_activity_records.findMany({
      where,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        target_entity_label: true,
        details: true,
        created_at: true,
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
        member: {
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
  const total = await MyGlobal.prisma.hrm_time_tracking_activity_records.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map(
      (record): IHrmTimeTrackingActivityRecord.ISummary => ({
        id: record.id,
        organization: {
          id: record.organization.id,
          name: record.organization.name,
          description: record.organization.description,
          logoImageUrl: record.organization.logo_image_url,
          currency: record.organization.currency,
          timezone: record.organization.timezone,
          fiscalStartMonth: record.organization.fiscal_start_month,
          createdAt: record.organization.created_at.toISOString(),
          updatedAt: record.organization.updated_at.toISOString(),
          deletedAt: record.organization.deleted_at?.toISOString() ?? null,
        },
        member:
          record.member === null
            ? null
            : {
                id: record.member.id,
                email: record.member.email,
                is_active: record.member.is_active,
                last_login_at:
                  record.member.last_login_at?.toISOString() ?? null,
                created_at: record.member.created_at.toISOString(),
                updated_at: record.member.updated_at.toISOString(),
                deleted_at: record.member.deleted_at?.toISOString() ?? null,
              },
        actionType: record.action_type,
        targetEntityType: record.target_entity_type,
        targetEntityId: record.target_entity_id,
        targetEntityLabel: record.target_entity_label,
        details: record.details,
        createdAt: record.created_at.toISOString(),
      }),
    ),
  };
}
