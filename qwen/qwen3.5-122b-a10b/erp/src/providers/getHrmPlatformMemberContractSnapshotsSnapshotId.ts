import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { IHrmPlatformContractSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContractSnapshot";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformContractSnapshotTransformer } from "../transformers/HrmPlatformContractSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberContractSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformContractSnapshot> {
  const snapshot =
    await MyGlobal.prisma.hrm_platform_contract_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...HrmPlatformContractSnapshotTransformer.select(),
    });
  // Get the contract to find the employee
  const contract =
    await MyGlobal.prisma.hrm_platform_contracts.findUniqueOrThrow({
      where: { id: snapshot.contract.id },
      select: { hrm_platform_employee_id: true },
    });
  // Check if member owns the contract (is the employee)
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      id: contract.hrm_platform_employee_id,
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    // Check for employee:view or org:manage permission
    const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
      where: {
        employeeAssignments: {
          some: {
            hrm_platform_user_id: props.member.id,
            deleted_at: null,
          },
        },
        deleted_at: null,
      },
      select: {
        id: true,
        permissions: {
          where: { deleted_at: null },
          select: {
            permission: {
              select: { code: true },
            },
          },
        },
      },
    });
    if (!role) {
      throw new HttpException("Forbidden", 403);
    }
    const hasPermission = role.permissions.some(
      (rp) =>
        rp.permission.code === "employee:view" ||
        rp.permission.code === "org:manage",
    );
    if (!hasPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await HrmPlatformContractSnapshotTransformer.transform(snapshot);
}
