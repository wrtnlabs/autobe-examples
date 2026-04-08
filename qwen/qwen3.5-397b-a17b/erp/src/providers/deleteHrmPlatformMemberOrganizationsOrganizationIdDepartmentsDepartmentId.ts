import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
    where: {
      id: props.departmentId,
      hrm_platform_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.hrm_platform_departments.updateMany({
    where: {
      parent_department_id: props.departmentId,
      deleted_at: null,
    },
    data: {
      parent_department_id: null,
      updated_at: new Date().toISOString(),
    },
  });
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: {
      id: props.departmentId,
    },
    data: {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}
