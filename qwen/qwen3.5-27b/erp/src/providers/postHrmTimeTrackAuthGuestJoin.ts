import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackGuestTransformer } from "../transformers/HrmTimeTrackGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackAuthGuestJoin(props: {
  ip: string;
  body: IHrmTimeTrackGuest.IJoin;
}): Promise<IHrmTimeTrackGuest.IAuthorized> {
  // 1. Find guest invitation by email
  const guest = await MyGlobal.prisma.hrm_time_track_guests.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          currency: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
        },
      } satisfies Prisma.hrm_time_track_organizationsFindManyArgs,
      role: {
        select: {
          id: true,
          name: true,
          description: true,
          is_builtin: true,
          created_at: true,
        },
      } satisfies Prisma.hrm_time_track_rolesFindManyArgs,
    },
  });
  if (guest === null) {
    throw new HttpException("Invitation not found", 404);
  }
  // 2. Validate invitation token
  if (guest.id !== props.body.invitationToken) {
    throw new HttpException("Invalid invitation token", 400);
  }
  // 3. Verify invitation status is 'pending'
  if (guest.status !== "pending") {
    throw new HttpException("Invitation is not pending", 400);
  }
  // 4. Verify invitation has not expired
  const now = new Date();
  if (guest.expires_at < now) {
    throw new HttpException("Invitation has expired", 400);
  }
  // 5. Check if email is already registered
  const existingMember = await MyGlobal.prisma.hrm_time_track_members.findFirst(
    {
      where: {
        email: props.body.email,
        deleted_at: null,
      },
    },
  );
  if (existingMember !== null) {
    throw new HttpException("Email is already registered", 409);
  }
  // 6. Create member account with hashed password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const member = await MyGlobal.prisma.hrm_time_track_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 7. Create employee record linking member to organization with assigned role
  const employee = await MyGlobal.prisma.hrm_time_track_employees.create({
    data: {
      id: v4(),
      hrm_time_track_organization_id: guest.hrm_time_track_organization_id,
      hrm_time_track_member_id: member.id,
      hrm_time_track_department_id: null,
      hrm_time_track_role_id: guest.hrm_time_track_role_id,
      position: "Employee",
      employment_type: "full-time",
      status: "active",
      hire_date: now,
      termination_date: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 8. Update guest invitation status to 'accepted'
  await MyGlobal.prisma.hrm_time_track_guests.update({
    where: {
      id: guest.id,
    },
    data: {
      status: "accepted",
      updated_at: now,
    },
  });
  // 9. Create guest session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.hrm_time_track_guest_sessions.create({
    data: {
      id: v4(),
      hrm_time_track_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 10. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 11. Fetch updated guest with organization and role for response
  const updatedGuest =
    await MyGlobal.prisma.hrm_time_track_guests.findUniqueOrThrow({
      where: {
        id: guest.id,
      },
      ...HrmTimeTrackGuestTransformer.select(),
    });
  // 12. Transform guest to DTO
  const transformedGuest =
    await HrmTimeTrackGuestTransformer.transform(updatedGuest);
  // 13. Return IAuthorized response
  return {
    ...transformedGuest,
    token,
  } satisfies IHrmTimeTrackGuest.IAuthorized;
}
