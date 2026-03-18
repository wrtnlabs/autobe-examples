import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsEmployeeTransformer } from "../transformers/HrmsEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmsMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmsEmployee> {
  // Validate session is active and get organization context
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
    select: { current_organization_id: true },
  });
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  if (session.current_organization_id === null) {
    throw new HttpException("No organization context selected", 403);
  }
  const userOrganizationId: string & tags.Format<"uuid"> =
    session.current_organization_id;
  // Fetch employee with all required joins via transformer
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: {
      id: props.employeeId,
      deleted_at: null,
    },
    ...HrmsEmployeeTransformer.select(),
  });
  // Validate employee's membership is active
  if (employee.organizationMember.deleted_at !== null) {
    throw new HttpException("Employee membership is deactivated", 403);
  }
  // Validate organization context - employee must be in user's selected organization
  if (employee.organizationMember.organization.id !== userOrganizationId) {
    throw new HttpException("Forbidden", 403);
  }
  // Check permissions
  // User can view if viewing their own record or has employee viewing permission
  const isOwnRecord: boolean =
    employee.organizationMember.member.id === props.member.id;
  if (!isOwnRecord) {
    // User must have employee:view permission
    // Query membership by member_id and organization_id
    const userMembership =
      await MyGlobal.prisma.hrms_organization_members.findFirst({
        where: {
          hrms_member_id: props.member.id,
          hrms_organization_id: userOrganizationId,
          deleted_at: null,
        },
        include: {
          organizationRole: {
            include: {
              permissions: {
                where: {
                  permission: "employee:view",
                },
              },
            },
          },
        },
      });
    if (userMembership === null) {
      throw new HttpException("Forbidden", 403);
    }
    if (userMembership.organizationRole.permissions.length === 0) {
      throw new HttpException("Forbidden", 403);
    }
  }
  return await HrmsEmployeeTransformer.transform(employee);
}
