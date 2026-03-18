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
  // Verify member has org:manage permission in this organization
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
  const hasManagePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
        permission: {
          code: "org:manage",
        },
      },
    });
  if (hasManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Query snapshot with organization context validation
  // findUniqueOrThrow will return 404 if snapshot not found or belongs to different organization
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
  return await HrmPlatformOrganizationSnapshotTransformer.transform(snapshot);
}
