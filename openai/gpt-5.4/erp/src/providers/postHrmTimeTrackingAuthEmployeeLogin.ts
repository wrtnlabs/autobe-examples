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
import { HrmTimeTrackingRoleAtSummaryTransformer } from "../transformers/HrmTimeTrackingRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingAuthEmployeeLogin(props: {
  ip: string;
  body: IHrmTimeTrackingEmployee.ILogin;
}): Promise<IHrmTimeTrackingEmployee.IAuthorized> {
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      email_verified_at: true,
      last_logged_in_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (employee === null || employee.deleted_at !== null)
    throw new HttpException("Invalid credentials", 401);
  if (
    (await PasswordUtil.verify(props.body.password, employee.password_hash)) ===
    false
  )
    throw new HttpException("Invalid credentials", 401);
  const nowDate = new globalThis.Date();
  const accessExpiredAtDate = new globalThis.Date(
    globalThis.Date.now() + 60 * 60 * 1000,
  );
  const refreshableUntilDate = new globalThis.Date(
    globalThis.Date.now() + 7 * 24 * 60 * 60 * 1000,
  );
  const now = toISOStringSafe(nowDate);
  const accessExpiredAt = toISOStringSafe(accessExpiredAtDate);
  const refreshableUntil = toISOStringSafe(refreshableUntilDate);
  await MyGlobal.prisma.hrm_time_tracking_employees.update({
    where: {
      id: employee.id,
    },
    data: {
      last_logged_in_at: now,
    },
  });
  const session =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.create({
      data: {
        id: v4(),
        hrm_time_tracking_employee_id: employee.id,
        hrm_time_tracking_organization_id: null,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        logged_out_at: null,
        created_at: now,
        expired_at: accessExpiredAt,
      },
      select: {
        id: true,
      },
    });
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      name: "Employee",
      built_in: true,
      deleted_at: null,
    },
    ...HrmTimeTrackingRoleAtSummaryTransformer.select(),
  });
  return {
    id: employee.id,
    email: employee.email,
    email_verified_at:
      employee.email_verified_at !== null
        ? toISOStringSafe(employee.email_verified_at)
        : null,
    last_logged_in_at: now,
    role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(role),
    department: null,
    created_at: toISOStringSafe(employee.created_at),
    updated_at: toISOStringSafe(employee.updated_at),
    deleted_at: null,
    token: {
      access: jwt.sign(
        {
          type: "employee",
          id: employee.id,
          session_id: session.id,
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "1h",
          issuer: "autobe",
        },
      ),
      refresh: jwt.sign(
        {
          type: "employee",
          id: employee.id,
          session_id: session.id,
          tokenType: "refresh",
          created_at: now,
        },
        MyGlobal.env.JWT_SECRET_KEY,
        {
          expiresIn: "7d",
          issuer: "autobe",
        },
      ),
      expired_at: accessExpiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
