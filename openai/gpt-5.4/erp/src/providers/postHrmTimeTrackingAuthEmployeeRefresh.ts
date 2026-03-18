import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthEmployeeRefresh(props: {
  body: IHrmTimeTrackingEmployee.IRefresh;
}): Promise<IHrmTimeTrackingEmployee.IAuthorized> {
  const unauthorized = (): never => {
    throw new HttpException("Unauthorized", 401);
  };
  const forbidden = (): never => {
    throw new HttpException("Forbidden", 403);
  };
  const verifiedToken: unknown = (() => {
    try {
      return jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      });
    } catch {
      return unauthorized();
    }
  })();
  if (typeof verifiedToken !== "object" || verifiedToken === null)
    unauthorized();
  if (!Object.prototype.hasOwnProperty.call(verifiedToken, "type"))
    unauthorized();
  if (!Object.prototype.hasOwnProperty.call(verifiedToken, "id"))
    unauthorized();
  if (!Object.prototype.hasOwnProperty.call(verifiedToken, "session_id"))
    unauthorized();
  const verified = verifiedToken as {
    type: unknown;
    id: unknown;
    session_id: unknown;
  };
  if (verified.type !== "employee") unauthorized();
  if (typeof verified.id !== "string") unauthorized();
  if (typeof verified.session_id !== "string") unauthorized();
  const employeeId = verified.id as string;
  const sessionId = verified.session_id as string;
  const session =
    (await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findFirst({
      where: {
        id: sessionId,
        hrm_time_tracking_employee_id: employeeId,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_organization_id: true,
        logged_out_at: true,
        expired_at: true,
      },
    })) ?? unauthorized();
  if (session.logged_out_at !== null) unauthorized();
  if (session.expired_at.getTime() <= Date.now()) unauthorized();
  if (session.hrm_time_tracking_organization_id === null) unauthorized();
  const organizationId = session.hrm_time_tracking_organization_id as string;
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: {
        id: employeeId,
      },
      select: {
        id: true,
        email: true,
        email_verified_at: true,
        last_logged_in_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (employee.deleted_at !== null) forbidden();
  const organizationEmployee =
    await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
      where: {
        deleted_at: null,
        hrm_time_tracking_organization_id: organizationId,
      },
      select: {
        id: true,
        name: true,
        built_in: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: {
        id: organizationId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency_code: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
      },
    });
  const issuedAt = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "employee",
        id: employeeId,
        session_id: sessionId,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "1h",
      },
    ),
    refresh: jwt.sign(
      {
        type: "employee",
        id: employeeId,
        session_id: sessionId,
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
        expiresIn: "7d",
      },
    ),
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  await MyGlobal.prisma.hrm_time_tracking_employee_sessions.update({
    where: {
      id: sessionId,
    },
    data: {
      expired_at: new globalThis.Date(refreshableUntil),
    },
  });
  return {
    id: employee.id,
    email: employee.email,
    email_verified_at:
      employee.email_verified_at !== null
        ? toISOStringSafe(employee.email_verified_at)
        : null,
    last_logged_in_at:
      employee.last_logged_in_at !== null
        ? toISOStringSafe(employee.last_logged_in_at)
        : null,
    role: {
      id: organizationEmployee.id,
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        logo_uri: organization.logo_uri,
        currency_code: organization.currency_code,
        timezone: organization.timezone,
        fiscal_start_month: organization.fiscal_start_month,
        created_at: toISOStringSafe(organization.created_at),
        updated_at: toISOStringSafe(organization.updated_at),
      } satisfies IHrmTimeTrackingOrganization.ISummary,
      name: organizationEmployee.name,
      built_in: organizationEmployee.built_in,
      created_at: toISOStringSafe(organizationEmployee.created_at),
      updated_at: toISOStringSafe(organizationEmployee.updated_at),
      deleted_at:
        organizationEmployee.deleted_at !== null
          ? toISOStringSafe(organizationEmployee.deleted_at)
          : null,
    } satisfies IHrmTimeTrackingRole.ISummary,
    department: null,
    created_at: toISOStringSafe(employee.created_at),
    updated_at: toISOStringSafe(employee.updated_at),
    deleted_at:
      employee.deleted_at !== null
        ? toISOStringSafe(employee.deleted_at)
        : null,
    token,
  };
}
