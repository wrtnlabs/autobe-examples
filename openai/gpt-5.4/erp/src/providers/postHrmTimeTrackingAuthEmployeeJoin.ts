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

export async function postHrmTimeTrackingAuthEmployeeJoin(props: {
  ip: string;
  body: IHrmTimeTrackingEmployee.IJoin;
}): Promise<IHrmTimeTrackingEmployee.IAuthorized> {
  const normalizedEmail = props.body.email.trim().toLowerCase();
  const existing = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null)
    throw new HttpException("Email already registered", 409);
  const invitation =
    await MyGlobal.prisma.hrm_time_tracking_organization_invitations.findFirst({
      where: {
        email: normalizedEmail,
        status: "pending",
        deleted_at: null,
        resolved_at: null,
        cancelled_at: null,
        hrm_time_tracking_role_id: {
          not: null,
        },
      },
      orderBy: {
        created_at: "asc",
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        role: HrmTimeTrackingRoleAtSummaryTransformer.select(),
      },
    });
  if (invitation === null || invitation.role === null)
    throw new HttpException(
      "Registration cannot be completed without an organization invitation role",
      500,
    );
  const now = new Date();
  const expiredAt = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshableUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const employee = await tx.hrm_time_tracking_employees.create({
      data: {
        id: v4(),
        email: normalizedEmail,
        password_hash: passwordHash,
        email_verified_at: null,
        last_logged_in_at: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
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
    const session = await tx.hrm_time_tracking_employee_sessions.create({
      data: {
        id: v4(),
        employee: {
          connect: {
            id: employee.id,
          },
        },
        organization: {
          connect: {
            id: invitation.hrm_time_tracking_organization_id,
          },
        },
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        logged_out_at: null,
        created_at: now,
        expired_at: expiredAt,
      },
      select: {
        id: true,
      },
    });
    return {
      employee,
      session,
    };
  });
  const token = {
    access: jwt.sign(
      {
        type: "employee",
        id: created.employee.id,
        session_id: created.session.id,
        created_at: now.toISOString(),
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
        id: created.employee.id,
        session_id: created.session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at:
      now.constructor === Date
        ? expiredAt.toISOString()
        : expiredAt.toISOString(),
    refreshable_until:
      now.constructor === Date
        ? refreshableUntil.toISOString()
        : refreshableUntil.toISOString(),
  };
  return {
    id: created.employee.id,
    email: created.employee.email,
    email_verified_at:
      created.employee.email_verified_at?.toISOString() ?? null,
    last_logged_in_at:
      created.employee.last_logged_in_at?.toISOString() ?? null,
    role: await HrmTimeTrackingRoleAtSummaryTransformer.transform(
      invitation.role,
    ),
    department: null,
    created_at: created.employee.created_at.toISOString(),
    updated_at: created.employee.updated_at.toISOString(),
    deleted_at: created.employee.deleted_at?.toISOString() ?? null,
    token,
  };
}
