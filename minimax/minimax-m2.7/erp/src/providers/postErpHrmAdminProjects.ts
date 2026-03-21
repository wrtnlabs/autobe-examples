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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminProjects(props: {
  admin: AdminPayload;
  body: IErpHrmProjectMember.ICreate;
}): Promise<IErpHrmProjectMember> {
  // 1) Get the first organization (admin should have org context from session)
  // Since erp_hrm_admins doesn't have erp_hrm_organization_id field directly,
  // we need to get organization from elsewhere or use a default approach
  const organizations = await MyGlobal.prisma.erp_hrm_organizations.findMany({
    take: 1,
    select: { id: true },
  });
  if (organizations.length === 0) {
    throw new HttpException("No organization found", 400);
  }
  const organizationId = organizations[0].id;
  // 2) Check for duplicate project name within the organization
  const existing = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: {
      erp_hrm_organization_id_name: {
        erp_hrm_organization_id: organizationId,
        name: props.body.name,
      },
    },
  });
  if (existing !== null) {
    throw new HttpException(
      `Project with name '${props.body.name}' already exists in this organization`,
      409,
    );
  }
  // 3) Create project using collector
  const created = await MyGlobal.prisma.erp_hrm_projects.create({
    data: await ErpHrmProjectMemberCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: organizationId },
    }),
    ...ErpHrmProjectMemberTransformer.select(),
  });
  // 4) Transform and return response
  return await ErpHrmProjectMemberTransformer.transform(created);
}
