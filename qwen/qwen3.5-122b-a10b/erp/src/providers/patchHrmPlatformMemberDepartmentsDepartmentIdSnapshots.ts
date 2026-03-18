import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartmentSnapshot";
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

export async function patchHrmPlatformMemberDepartmentsDepartmentIdSnapshots(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartmentSnapshot.IRequest;
}): Promise<IPageIHrmPlatformDepartmentSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const department = await MyGlobal.prisma.hrm_platform_departments.findFirst({
    where: {
      id: props.departmentId,
      deleted_at: null,
    },
  });
  if (department === null) {
    throw new HttpException("Department not found", 404);
  }
  const whereInput: Prisma.hrm_platform_department_snapshotsWhereInput = {
    hrm_platform_department_id: props.departmentId,
    deleted_at: null,
    ...(props.body.parent_department_id && {
      parent_department_id: props.body.parent_department_id,
    }),
    ...(props.body.name && {
      name: {
        contains: props.body.name,
      },
    }),
    ...(props.body.date_from && {
      created_at: {
        gte: new Date(props.body.date_from),
      },
    }),
    ...(props.body.date_to && {
      created_at: {
        lte: new Date(props.body.date_to),
      },
    }),
  } satisfies Prisma.hrm_platform_department_snapshotsWhereInput;
  const snapshots =
    await MyGlobal.prisma.hrm_platform_department_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total = await MyGlobal.prisma.hrm_platform_department_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: snapshots.map(
      (snapshot) =>
        ({
          id: snapshot.id as string & tags.Format<"uuid">,
          hrm_platform_department_id:
            snapshot.hrm_platform_department_id as string & tags.Format<"uuid">,
          parent_department_id: snapshot.parent_department_id
            ? (snapshot.parent_department_id as string & tags.Format<"uuid">)
            : null,
          name: snapshot.name,
          description: snapshot.description,
          created_at: toISOStringSafe(snapshot.created_at),
          deleted_at: snapshot.deleted_at
            ? toISOStringSafe(snapshot.deleted_at)
            : null,
        }) satisfies IHrmPlatformDepartmentSnapshot.ISummary,
    ),
  } satisfies IPageIHrmPlatformDepartmentSnapshot.ISummary;
}
