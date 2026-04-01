import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsAuthMemberLogin(props: {
  ip: string;
  body: IHrmsMember.ILogin;
}): Promise<IHrmsMember.IAuthorized> {
  const member = await MyGlobal.prisma.hrms_members.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      display_name: true,
      avatar_uri: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organizationMembers: {
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          member: {
            select: {
              id: true,
              email: true,
              display_name: true,
              avatar_uri: true,
              phone_number: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              description: true,
              logo_uri: true,
              currency: true,
              timezone: true,
              fiscal_start_month: true,
              owner: {
                select: {
                  id: true,
                  email: true,
                  display_name: true,
                  avatar_uri: true,
                  phone_number: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          organizationRole: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
              organization_id: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      },
    },
  });
  if (!member || member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpiresDate: Date = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpiresDate: Date = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );
  const accessExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpiresDate);
  const refreshExpires: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpiresDate);
  const nowDate: Date = new Date();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(nowDate);
  await MyGlobal.prisma.hrms_member_sessions.deleteMany({
    where: { hrms_member_id: member.id },
  });
  const session = await MyGlobal.prisma.hrms_member_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrms_member_id: member.id,
      access_token: "",
      refresh_token: "",
      ip: props.ip,
      href: "",
      referrer: "",
      user_agent: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  const jwtPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: now,
  };
  const access: string = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
    issuer: "autobe",
  });
  const refresh: string = jwt.sign(
    {
      ...jwtPayload,
      tokenType: "refresh" as const,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  await MyGlobal.prisma.hrms_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: access,
      refresh_token: refresh,
    },
  });
  const memberData: IHrmsMember = {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_uri: member.avatar_uri ?? null,
    phone_number: member.phone_number ?? null,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    organization_memberships: [],
  };
  const organizationMemberships: IHrmsOrganizationMember.ISummary[] =
    await ArrayUtil.asyncMap(
      member.organizationMembers.filter((om) => om.deleted_at === null),
      async (om) => {
        const memberSummary: IHrmsMember.ISummary = {
          id: om.member.id,
          email: om.member.email,
          display_name: om.member.display_name,
          avatar_uri: om.member.avatar_uri ?? null,
          phone_number: om.member.phone_number ?? null,
          organization_membership_count: 0,
          created_at: toISOStringSafe(om.member.created_at),
          updated_at: toISOStringSafe(om.member.updated_at),
          deleted_at: om.member.deleted_at
            ? toISOStringSafe(om.member.deleted_at)
            : null,
        } satisfies IHrmsMember.ISummary;
        const organizationSummary: IHrmsOrganization.ISummary = {
          id: om.organization.id,
          name: om.organization.name,
          description: om.organization.description ?? null,
          logo_uri: om.organization.logo_uri ?? null,
          currency: om.organization.currency,
          timezone: om.organization.timezone,
          fiscal_start_month: om.organization.fiscal_start_month,
          owner: {
            id: om.organization.owner.id,
            email: om.organization.owner.email,
            display_name: om.organization.owner.display_name,
            avatar_uri: om.organization.owner.avatar_uri ?? null,
            phone_number: om.organization.owner.phone_number ?? null,
            organization_membership_count: 0,
            created_at: toISOStringSafe(om.organization.owner.created_at),
            updated_at: toISOStringSafe(om.organization.owner.updated_at),
            deleted_at: om.organization.owner.deleted_at
              ? toISOStringSafe(om.organization.owner.deleted_at)
              : null,
          } satisfies IHrmsMember.ISummary,
          created_at: toISOStringSafe(om.organization.created_at),
          updated_at: toISOStringSafe(om.organization.updated_at),
          deleted_at: om.organization.deleted_at
            ? toISOStringSafe(om.organization.deleted_at)
            : null,
        } satisfies IHrmsOrganization.ISummary;
        const organizationRoleSummary: IHrmsOrganizationRole.ISummary = {
          id: om.organizationRole.id,
          name: om.organizationRole.name,
          is_builtin: om.organizationRole.is_builtin,
          organization: organizationSummary,
          created_at: toISOStringSafe(om.organizationRole.created_at),
          updated_at: toISOStringSafe(om.organizationRole.updated_at),
          members_count: 0,
        } satisfies IHrmsOrganizationRole.ISummary;
        return {
          id: om.id,
          member: memberSummary,
          organization: organizationSummary,
          organizationRole: organizationRoleSummary,
          created_at: toISOStringSafe(om.created_at),
          updated_at: toISOStringSafe(om.updated_at),
          deleted_at: om.deleted_at ? toISOStringSafe(om.deleted_at) : null,
        } satisfies IHrmsOrganizationMember.ISummary;
      },
    );
  memberData.organization_memberships = organizationMemberships;
  return {
    ...memberData,
    token,
  } satisfies IHrmsMember.IAuthorized;
}
