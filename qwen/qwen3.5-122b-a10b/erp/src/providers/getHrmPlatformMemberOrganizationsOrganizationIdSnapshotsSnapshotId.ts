import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationSnapshotTransformer } from "../transformers/HrmPlatformOrganizationSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberOrganizationsOrganizationIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformOrganizationSnapshot> {
  // Query snapshot with organization context validation
  const snapshot =
    await MyGlobal.prisma.hrm_platform_organization_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
          hrm_platform_organization_id: props.organizationId,
        },
        ...HrmPlatformOrganizationSnapshotTransformer.select(),
      },
    );
  // Verify member has org:manage permission through their role
  // First get the permission ID for "org:manage"
  const permission = await MyGlobal.prisma.hrm_platform_permissions.findFirst({
    where: { code: "org:manage", deleted_at: null },
    select: { id: true },
  });
  if (permission === null) {
    throw new HttpException("Permission not found", 500);
  }
  // Find employee record for this member in this organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: { hrm_platform_role_id: true },
  });
  if (employee === null) {
    throw new HttpException("Not a member of this organization", 403);
  }
  // Check if the employee's role has the org:manage permission
  const hasManagePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
        hrm_platform_permission_id: permission.id,
        deleted_at: null,
      },
    });
  if (hasManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmPlatformOrganizationSnapshotTransformer.transform(snapshot);
}
