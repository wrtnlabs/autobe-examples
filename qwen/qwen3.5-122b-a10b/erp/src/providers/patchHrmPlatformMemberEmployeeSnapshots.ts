import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeSnapshot";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeeSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeSnapshot";
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

export async function patchHrmPlatformMemberEmployeeSnapshots(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeSnapshot.IRequest;
}): Promise<IPageIHrmPlatformEmployeeSnapshot.ISummary> {
  // Determine pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const pageSize = props.body.page_size ?? 50;
  const effectiveLimit = Math.min(limit, pageSize, 200);
  const skip = (page - 1) * effectiveLimit;
  // Build where clause from filters
  const whereInput: Prisma.hrm_platform_employee_snapshotsWhereInput = {
    deleted_at: null,
    user: { is: {} },
    organization: { is: {} },
    role: { is: {} },
    ...(props.body.hrm_platform_employee_id && {
      hrm_platform_employee_id: props.body.hrm_platform_employee_id,
    }),
    ...(props.body.hrm_platform_user_id && {
      hrm_platform_user_id: props.body.hrm_platform_user_id,
    }),
    ...(props.body.status && {
      status: props.body.status,
    }),
    ...(props.body.employment_type && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  };
  // Fetch snapshots with nested relations
  const snapshots =
    await MyGlobal.prisma.hrm_platform_employee_snapshots.findMany({
      where: whereInput,
      skip,
      take: effectiveLimit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        position: true,
        employment_type: true,
        status: true,
        created_at: true,
        user: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_image: true,
            phone_number: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_url: true,
            currency: true,
            timezone: true,
            fiscal_start_month: true,
            created_at: true,
            updated_at: true,
          },
        },
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            is_builtin: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
            created_at: true,
            deleted_at: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
            description: true,
            parent_department_id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  // Get total count
  const total = await MyGlobal.prisma.hrm_platform_employee_snapshots.count({
    where: whereInput,
  });
  // Transform to summary format
  const data = await ArrayUtil.asyncMap(snapshots, async (snapshot) => {
    const rolePermissions =
      snapshot.role?.permissions?.map((rp) => rp.permission.code) ?? [];
    return {
      id: snapshot.id as string & tags.Format<"uuid">,
      position: snapshot.position ?? null,
      employment_type: snapshot.employment_type,
      status: snapshot.status,
      created_at: toISOStringSafe(snapshot.created_at) as string &
        tags.Format<"date-time">,
      user: {
        id: snapshot.user.id as string & tags.Format<"uuid">,
        email: snapshot.user.email as string & tags.Format<"email">,
        display_name: snapshot.user.display_name,
        avatar_image: snapshot.user.avatar_image as
          | (string & tags.Format<"url">)
          | null
          | undefined,
        phone_number: snapshot.user.phone_number ?? null,
      } satisfies IHrmPlatformMember.ISummary,
      organization: {
        id: snapshot.organization.id as string & tags.Format<"uuid">,
        name: snapshot.organization.name,
        description: snapshot.organization.description ?? null,
        logo_url: snapshot.organization.logo_url as
          | (string & tags.Format<"url">)
          | null
          | undefined,
        currency: snapshot.organization.currency,
        timezone: snapshot.organization.timezone,
        fiscal_start_month: snapshot.organization.fiscal_start_month as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<12>,
        created_at: toISOStringSafe(
          snapshot.organization.created_at,
        ) as string & tags.Format<"date-time">,
        updated_at: toISOStringSafe(
          snapshot.organization.updated_at,
        ) as string & tags.Format<"date-time">,
      } satisfies IHrmPlatformOrganization.ISummary,
      role: {
        id: snapshot.role.id as string & tags.Format<"uuid">,
        code: snapshot.role.code,
        name: snapshot.role.name,
        description: snapshot.role.description ?? null,
        is_builtin: snapshot.role.is_builtin,
        permissions: rolePermissions,
        created_at: toISOStringSafe(snapshot.role.created_at) as string &
          tags.Format<"date-time">,
        deleted_at: snapshot.role.deleted_at
          ? (toISOStringSafe(snapshot.role.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      } satisfies IHrmPlatformRole.ISummary,
      department: snapshot.department
        ? ({
            id: snapshot.department.id as string & tags.Format<"uuid">,
            name: snapshot.department.name,
            description: snapshot.department.description ?? null,
            parent_department: null,
            created_at: toISOStringSafe(
              snapshot.department.created_at,
            ) as string & tags.Format<"date-time">,
            updated_at: toISOStringSafe(
              snapshot.department.updated_at,
            ) as string & tags.Format<"date-time">,
            deleted_at: snapshot.department.deleted_at
              ? (toISOStringSafe(snapshot.department.deleted_at) as string &
                  tags.Format<"date-time">)
              : null,
          } satisfies IHrmPlatformDepartment.ISummary)
        : null,
    } satisfies IHrmPlatformEmployeeSnapshot.ISummary;
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: effectiveLimit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / effectiveLimit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmPlatformEmployeeSnapshot.ISummary;
}
