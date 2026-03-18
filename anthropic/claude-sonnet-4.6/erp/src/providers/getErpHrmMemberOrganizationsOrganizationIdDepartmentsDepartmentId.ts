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

export async function getErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IErpHrmDepartment> {
  // Step 1: Verify the requesting member belongs to the target organization
  const membership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Fetch the department record (scoped to org, must be active)
  const department = await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow(
    {
      where: {
        id: props.departmentId,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      ...ErpHrmDepartmentTransformer.select(),
    },
  );
  // Step 3: Transform and return
  return ErpHrmDepartmentTransformer.transform(department);
}
