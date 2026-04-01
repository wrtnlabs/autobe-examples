import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformDepartmentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartmentSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentSnapshotTransformer } from "../transformers/HrmPlatformDepartmentSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberDepartmentSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformDepartmentSnapshot> {
  // Verify member has org:manage permission through their employees' roles
  const member = await MyGlobal.prisma.hrm_platform_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      employees: {
        select: {
          id: true,
          role: {
            select: {
              id: true,
              permissions: {
                select: {
                  permission: {
                    select: {
                      id: true,
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (member === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if member has org:manage permission in any of their employees' roles
  const hasOrgManagePermission = member.employees.some(
    (employee) =>
      employee.role?.permissions.some(
        (rp) => rp.permission.code === "org:manage",
      ) ?? false,
  );
  if (!hasOrgManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the department snapshot by ID, ensuring it's not soft-deleted
  const snapshot =
    await MyGlobal.prisma.hrm_platform_department_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        deleted_at: null,
      },
      ...HrmPlatformDepartmentSnapshotTransformer.select(),
    });
  // Transform and return the response
  return await HrmPlatformDepartmentSnapshotTransformer.transform(snapshot);
}
