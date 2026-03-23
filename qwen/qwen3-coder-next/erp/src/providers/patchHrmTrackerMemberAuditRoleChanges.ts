import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeRoleChange";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerEmployeeRoleChange";
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

export async function patchHrmTrackerMemberAuditRoleChanges(props: {
  member: MemberPayload;
  body: IHrmTrackerEmployeeRoleChange.IRequest;
}): Promise<IPageIHrmTrackerEmployeeRoleChange.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.employee_id && {
      hrm_tracker_employee_id: props.body.employee_id,
    }),
    ...(props.body.actor_id && { hrm_tracker_member_id: props.body.actor_id }),
    ...(props.body.action_type && { action_type: props.body.action_type }),
    ...(props.body.changed_at && {
      changed_at: { gte: new Date(props.body.changed_at) },
    }),
  } satisfies Prisma.hrm_tracker_employee_role_changesWhereInput;
  const data = await MyGlobal.prisma.hrm_tracker_employee_role_changes.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { changed_at: "desc" },
      select: {
        id: true,
        hrm_tracker_employee_id: true,
        hrm_tracker_member_id: true,
        old_hrm_tracker_role_id: true,
        new_hrm_tracker_role_id: true,
        action_type: true,
        changed_at: true,
        ip_address: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            status: true,
            position: true,
            created_at: true,
            user: {
              select: {
                id: true,
                display_name: true,
                avatar_url: true,
                phone: true,
                status: true,
                email_verified: true,
              },
            },
          },
        },
        actor: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
            phone: true,
            status: true,
            email_verified: true,
          },
        },
        oldRole: {
          select: {
            id: true,
            name: true,
            description: true,
            is_custom: true,
            is_default: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        newRole: {
          select: {
            id: true,
            name: true,
            description: true,
            is_custom: true,
            is_default: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    },
  );
  const total = await MyGlobal.prisma.hrm_tracker_employee_role_changes.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (record) =>
        ({
          id: record.id,
          employee: {
            id: record.employee.id,
            status: record.employee.status,
            position: record.employee.position,
            created_at: toISOStringSafe(record.employee.created_at),
            user: {
              id: record.employee.user.id,
              display_name: record.employee.user.display_name,
              avatar_url: record.employee.user.avatar_url,
              phone: record.employee.user.phone,
              status: typia.assert<"active" | "deactivated" | "unknown">(
                record.employee.user.status,
              ) as "active" | "deactivated",
              email_verified: record.employee.user.email_verified,
            },
          },
          actor: {
            id: record.actor.id,
            display_name: record.actor.display_name,
            avatar_url: record.actor.avatar_url,
            phone: record.actor.phone,
            status: typia.assert<"active" | "deactivated">(record.actor.status),
            email_verified: record.actor.email_verified,
          },
          oldRole: record.oldRole
            ? {
                id: record.oldRole.id,
                name: record.oldRole.name,
                description: record.oldRole.description,
                is_custom: record.oldRole.is_custom,
                is_default: record.oldRole.is_default,
                created_at: toISOStringSafe(record.oldRole.created_at),
                updated_at: toISOStringSafe(record.oldRole.updated_at),
                deleted_at: record.oldRole.deleted_at
                  ? toISOStringSafe(record.oldRole.deleted_at)
                  : null,
              }
            : null,
          newRole: {
            id: record.newRole.id,
            name: record.newRole.name,
            description: record.newRole.description,
            is_custom: record.newRole.is_custom,
            is_default: record.newRole.is_default,
            created_at: toISOStringSafe(record.newRole.created_at),
            updated_at: toISOStringSafe(record.newRole.updated_at),
            deleted_at: record.newRole.deleted_at
              ? toISOStringSafe(record.newRole.deleted_at)
              : null,
          },
          action_type: record.action_type,
          changed_at: toISOStringSafe(record.changed_at),
          ip_address: record.ip_address,
          created_at: toISOStringSafe(record.created_at),
          updated_at: toISOStringSafe(record.updated_at),
          deleted_at: record.deleted_at
            ? toISOStringSafe(record.deleted_at)
            : null,
        }) satisfies IHrmTrackerEmployeeRoleChange.ISummary,
    ),
  };
}
