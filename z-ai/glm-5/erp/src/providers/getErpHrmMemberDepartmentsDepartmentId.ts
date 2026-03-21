import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IErpHrmDepartment> {
  // Get organization context from session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context selected", 400);
  }
  // Query department with organization isolation and soft-delete filter
  const department = await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow(
    {
      where: {
        id: props.departmentId,
        organization_id: session.erp_hrm_organization_id,
        deleted_at: null,
      },
      ...ErpHrmDepartmentTransformer.select(),
    },
  );
  return await ErpHrmDepartmentTransformer.transform(department);
}
