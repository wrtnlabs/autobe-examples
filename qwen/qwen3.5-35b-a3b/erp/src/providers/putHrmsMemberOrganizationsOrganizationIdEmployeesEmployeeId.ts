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

export async function putHrmsMemberOrganizationsOrganizationIdEmployeesEmployeeId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmsEmployee.IUpdate;
}): Promise<IHrmsEmployee> {
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: {
      id: true,
      deleted_at: true,
      organizationMember: {
        select: {
          id: true,
          member: { select: { id: true } },
          organization: { select: { id: true } },
          organizationRole: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (employee.organizationMember.organization.id !== props.organizationId) {
    throw new HttpException("Not found", 404);
  }
  if (employee.organizationMember.member.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  let departmentConnect:
    | {
        connect: {
          id: string;
        };
      }
    | {
        disconnect: true;
      }
    | undefined = undefined;
  if (props.body.department_id !== undefined) {
    if (props.body.department_id === null) {
      departmentConnect = { disconnect: true };
    } else {
      const department = await MyGlobal.prisma.hrms_departments.findFirst({
        where: {
          id: props.body.department_id,
          organization_id: props.organizationId,
          deleted_at: null,
        },
        select: { id: true },
      });
      if (department === null) {
        throw new HttpException("Department not found", 404);
      }
      departmentConnect = { connect: { id: props.body.department_id } };
    }
  }
  let roleConnect:
    | {
        connect: {
          id: string;
        };
      }
    | {
        disconnect: true;
      }
    | undefined = undefined;
  if (props.body.role_id !== undefined) {
    const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
      where: {
        id: props.body.role_id,
        organization_id: props.organizationId,
      },
      select: { id: true },
    });
    if (role === null) {
      throw new HttpException("Role not found", 404);
    }
    roleConnect = { connect: { id: props.body.role_id } };
  }
  const updateData: Prisma.hrms_employeesUpdateInput = {
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.position !== undefined && { position: props.body.position }),
    ...(props.body.employment_type !== undefined && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...((departmentConnect !== undefined || roleConnect !== undefined) && {
      ...(departmentConnect !== undefined && { department: departmentConnect }),
      ...(roleConnect !== undefined && { role: roleConnect }),
    }),
    updated_at: toISOStringSafe(new Date()),
  };
  await MyGlobal.prisma.hrms_employees.update({
    where: { id: props.employeeId },
    data: updateData,
  });
  const updated = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    ...HrmsEmployeeTransformer.select(),
  });
  return await HrmsEmployeeTransformer.transform(updated);
}
