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
  // Step 1: Find the snapshot by ID using transformer's select
  const snapshot =
    await MyGlobal.prisma.hrm_platform_contract_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...HrmPlatformContractSnapshotTransformer.select(),
    });
  // Step 2: Verify contract is not soft-deleted (already handled by findUniqueOrThrow if contract doesn't exist)
  // The contract relation is included via transformer.select()
  // Step 3: Check authorization - need to get employee's user_id
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: snapshot.contract.employee.id },
    select: {
      id: true,
      hrm_platform_user_id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
      deleted_at: true,
    },
  });
  if (!employee || employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  // Step 4: Check if member is the owner of the employee
  const isOwner = employee.hrm_platform_user_id === props.member.id;
  if (!isOwner) {
    // Step 5: Check if member has employee:view or org:manage permission
    const rolePermissions =
      await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
        where: {
          hrm_platform_role_id: employee.hrm_platform_role_id,
          deleted_at: null,
          permission: {
            deleted_at: null,
            code: { in: ["employee:view", "org:manage"] },
          },
        },
        select: {
          permission: {
            select: { code: true },
          },
        },
      });
    if (rolePermissions.length === 0) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 6: Transform and return using transformer
  return await HrmPlatformContractSnapshotTransformer.transform(snapshot);
}
