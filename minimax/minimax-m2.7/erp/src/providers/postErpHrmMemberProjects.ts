import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmProjectMemberCollector } from "../collectors/ErpHrmProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjects(props: {
  member: MemberPayload;
  body: IErpHrmProjectMember.ICreate;
}): Promise<IErpHrmProjectMember> {
  // 1. Get the member's employee record to extract organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: { erp_hrm_organization_id: true },
  });
  if (!employee) {
    throw new HttpException("Employee not found in current organization", 404);
  }
  // 2. Check for duplicate name within the organization using unique constraint
  const existingProject = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: {
      erp_hrm_organization_id_name: {
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
        name: props.body.name,
      },
    },
  });
  if (existingProject) {
    throw new HttpException(
      "Project with this name already exists in the organization",
      400,
    );
  }
  // 3. Create the project using the collector
  const created = await MyGlobal.prisma.erp_hrm_projects.create({
    data: await ErpHrmProjectMemberCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: employee.erp_hrm_organization_id },
    }),
    ...ErpHrmProjectMemberTransformer.select(),
  });
  // 4. Return the transformed response
  return await ErpHrmProjectMemberTransformer.transform(created);
}
