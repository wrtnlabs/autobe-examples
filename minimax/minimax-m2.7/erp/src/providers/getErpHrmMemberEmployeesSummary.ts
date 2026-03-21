import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberEmployeesSummary(props: {
  member: MemberPayload;
}): Promise<IErpHrmEmployee.ISummary> {
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    include: {
      member: {
        include: {
          activityLogs: true,
          employees: true,
          memberSessions: true,
          passwordResets: true,
          emailVerifications: true,
          ownedOrganization: true,
          generatedReports: true,
          taskHistories: true,
        },
      },
      role: {
        include: {
          organization: {
            include: {
              owner: {
                include: {
                  activityLogs: true,
                  employees: true,
                  memberSessions: true,
                  passwordResets: true,
                  emailVerifications: true,
                  ownedOrganization: true,
                  generatedReports: true,
                  taskHistories: true,
                },
              },
              activityLogs: true,
              reports: true,
              employees: true,
              roles: true,
              departments: true,
              projects: true,
              invitations: true,
            },
          },
          employees: true,
          invitations: true,
          rolePermissions: true,
        },
      },
      department: {
        include: {
          parent: true,
        },
      },
    },
  });
  return await ErpHrmEmployeeAtSummaryTransformer.transform(employee);
}
