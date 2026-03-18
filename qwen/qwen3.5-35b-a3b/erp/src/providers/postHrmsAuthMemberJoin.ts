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

export async function postHrmsAuthMemberJoin(props: {
  ip: string;
  body: IHrmsMember.IJoin;
}): Promise<IHrmsMember.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.hrms_members.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create member record (PasswordUtil handles hashing)
  const now = new Date();
  const member = await MyGlobal.prisma.hrms_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      display_name: props.body.display_name,
      avatar_uri: null,
      phone_number: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
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
  });
  // 3. Create session record
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.hrms_member_sessions.create({
    data: {
      id: v4(),
      hrms_member_id: member.id,
      access_token: "",
      refresh_token: "",
      current_organization_id: null,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      user_agent: "",
      created_at: now,
      expired_at: accessExpires,
    },
    select: {
      id: true,
      hrms_member_id: true,
      access_token: true,
      refresh_token: true,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Query organization memberships (member just created, likely none yet)
  const organizationMemberships =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_member_id: member.id,
        deleted_at: null,
      },
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
            created_at: true,
            updated_at: true,
            deleted_at: true,
            owner: {
              select: {
                id: true,
                display_name: true,
                avatar_uri: true,
                phone_number: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        organizationRole: {
          select: {
            id: true,
            name: true,
            is_builtin: true,
            created_at: true,
            updated_at: true,
            members_count: true,
            organization: {
              select: {
                id: true,
                name: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  // 6. Transform and return IAuthorized
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_uri: member.avatar_uri,
    phone_number: member.phone_number,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    organization_memberships: organizationMemberships.map((om) => ({
      id: om.id,
      member: {
        id: om.member.id,
        email: om.member.email,
        display_name: om.member.display_name,
        avatar_uri: om.member.avatar_uri,
        phone_number: om.member.phone_number,
        created_at: toISOStringSafe(om.member.created_at),
        updated_at: toISOStringSafe(om.member.updated_at),
        deleted_at:
          om.member.deleted_at !== null
            ? toISOStringSafe(om.member.deleted_at)
            : null,
        organization_membership_count: 1,
      },
      organization: {
        id: om.organization.id,
        name: om.organization.name,
        description: om.organization.description,
        logo_uri: om.organization.logo_uri,
        currency: om.organization.currency,
        timezone: om.organization.timezone,
        fiscal_start_month: om.organization.fiscal_start_month,
        created_at: toISOStringSafe(om.organization.created_at),
        updated_at: toISOStringSafe(om.organization.updated_at),
        deleted_at:
          om.organization.deleted_at !== null
            ? toISOStringSafe(om.organization.deleted_at)
            : null,
        owner: {
          id: om.organization.owner.id,
          display_name: om.organization.owner.display_name,
          avatar_uri: om.organization.owner.avatar_uri,
          phone_number: om.organization.owner.phone_number,
          email: om.organization.owner.email,
          created_at: toISOStringSafe(om.organization.owner.created_at),
          updated_at: toISOStringSafe(om.organization.owner.updated_at),
          deleted_at:
            om.organization.owner.deleted_at !== null
              ? toISOStringSafe(om.organization.owner.deleted_at)
              : null,
          organization_membership_count: 1,
        },
      },
      organizationRole: {
        id: om.organizationRole.id,
        name: om.organizationRole.name,
        is_builtin: om.organizationRole.is_builtin,
        created_at: toISOStringSafe(om.organizationRole.created_at),
        updated_at: toISOStringSafe(om.organizationRole.updated_at),
        members_count: om.organizationRole.members_count,
        organization: {
          id: om.organizationRole.organization.id,
          name: om.organizationRole.organization.name,
          created_at: toISOStringSafe(
            om.organizationRole.organization.created_at,
          ),
          updated_at: toISOStringSafe(
            om.organizationRole.organization.updated_at,
          ),
          deleted_at:
            om.organizationRole.organization.deleted_at !== null
              ? toISOStringSafe(om.organizationRole.organization.deleted_at)
              : null,
        },
      },
      organization_membership_count: 1,
      created_at: toISOStringSafe(om.created_at),
      updated_at: toISOStringSafe(om.updated_at),
      deleted_at:
        om.deleted_at !== null ? toISOStringSafe(om.deleted_at) : null,
    })),
    token,
  } satisfies IHrmsMember.IAuthorized;
}
