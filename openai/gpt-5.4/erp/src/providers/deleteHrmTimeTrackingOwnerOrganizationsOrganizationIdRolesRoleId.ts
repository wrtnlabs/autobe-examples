import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ownerRole =
    await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
      where: {
        hrm_time_tracking_organization_id: props.organizationId,
        built_in: true,
        name: "Owner",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      id: props.owner.id,
      deleted_at: null,
    },
  });
  const employeeRecord = employee as Record<string, unknown> | null;
  const employeeRoleId =
    employeeRecord !== null &&
    typeof employeeRecord["hrm_time_tracking_role_id"] === "string"
      ? (employeeRecord["hrm_time_tracking_role_id"] as string)
      : employeeRecord !== null && typeof employeeRecord["role_id"] === "string"
        ? (employeeRecord["role_id"] as string)
        : employeeRecord !== null &&
            typeof employeeRecord["roleId"] === "string"
          ? (employeeRecord["roleId"] as string)
          : null;
  if (employee === null || employeeRoleId !== ownerRole.id) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      built_in: true,
    },
  });
  if (role.built_in === true) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  const assignedEmployees =
    await MyGlobal.prisma.hrm_time_tracking_employees.findMany({
      where: {
        deleted_at: null,
      },
    });
  const assignedCount = assignedEmployees.filter((item) => {
    const record = item as Record<string, unknown>;
    const linkedRoleId =
      typeof record["hrm_time_tracking_role_id"] === "string"
        ? (record["hrm_time_tracking_role_id"] as string)
        : typeof record["role_id"] === "string"
          ? (record["role_id"] as string)
          : typeof record["roleId"] === "string"
            ? (record["roleId"] as string)
            : null;
    return linkedRoleId === role.id;
  }).length;
  if (assignedCount > 0) {
    throw new HttpException(
      "Custom role cannot be deleted while employees are assigned",
      409,
    );
  }
  await MyGlobal.prisma.hrm_time_tracking_roles.delete({
    where: {
      id: role.id,
    },
  });
}
