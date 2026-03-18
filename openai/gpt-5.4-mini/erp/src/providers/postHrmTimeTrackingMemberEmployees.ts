import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingEmployeeCollector } from "../collectors/HrmTimeTrackingEmployeeCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingEmployeeTransformer } from "../transformers/HrmTimeTrackingEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberEmployees(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingEmployee.ICreate;
}): Promise<IHrmTimeTrackingEmployee> {
  const activeOrganizationId = (
    props.member as unknown as {
      organization_id?: string & tags.Format<"uuid">;
    }
  ).organization_id;
  if (activeOrganizationId === undefined || activeOrganizationId === null)
    throw new HttpException("No organization selected", 400);
  const caller =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        organization_id: activeOrganizationId,
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true, role_id: true, organization_id: true },
    });
  const callerRole =
    await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
      where: { id: caller.role_id },
      select: { id: true, organization_id: true },
    });
  if (callerRole.organization_id !== activeOrganizationId)
    throw new HttpException("Forbidden", 403);
  const duplicated =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
      where: {
        organization_id: activeOrganizationId,
        user_account_id: props.body.userAccountId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (duplicated !== null)
    throw new HttpException(
      "Employee already exists in the selected organization",
      409,
    );
  await MyGlobal.prisma.hrm_time_tracking_user_accounts.findUniqueOrThrow({
    where: { id: props.body.userAccountId },
    select: { id: true },
  });
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
    where: { id: props.body.roleId },
    select: { id: true, organization_id: true },
  });
  if (role.organization_id !== activeOrganizationId)
    throw new HttpException(
      "Role does not belong to the selected organization",
      400,
    );
  if (
    props.body.departmentId !== undefined &&
    props.body.departmentId !== null
  ) {
    const department =
      await MyGlobal.prisma.hrm_time_tracking_departments.findUniqueOrThrow({
        where: { id: props.body.departmentId },
        select: { id: true, hrm_time_tracking_organization_id: true },
      });
    if (department.hrm_time_tracking_organization_id !== activeOrganizationId) {
      throw new HttpException(
        "Department does not belong to the selected organization",
        400,
      );
    }
  }
  const created = await MyGlobal.prisma.hrm_time_tracking_employees.create({
    data: await HrmTimeTrackingEmployeeCollector.collect({
      body: props.body,
      organization: { id: activeOrganizationId },
    }),
    ...HrmTimeTrackingEmployeeTransformer.select(),
  });
  return await HrmTimeTrackingEmployeeTransformer.transform(created);
}
