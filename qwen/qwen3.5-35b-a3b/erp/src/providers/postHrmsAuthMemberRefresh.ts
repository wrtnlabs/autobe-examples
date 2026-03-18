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

export async function postHrmsAuthMemberRefresh(props: {
  body: IHrmsMember.IRefresh;
}): Promise<IHrmsMember.IAuthorized> {
  // 1. Verify refresh token is valid JWT
  const decodedPayload = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  );
  const decoded = decodedPayload as {
    id: string;
    session_id: string;
    type: "member";
  };
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and matches member
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      hrms_member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member account is not deleted
  const member = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens with same session_id
  const accessExpiresTime = Date.now() + 15 * 60 * 1000;
  const refreshExpiresTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const nowIso = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  ) as string;
  const refreshToken = jwt.sign(
    {
      type: "member" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  ) as string;
  // 6. Update session with new tokens and extended expiration
  await MyGlobal.prisma.hrms_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: new Date(refreshExpiresTime),
    },
  });
  // 7. Build authorization token
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(new Date(accessExpiresTime)),
    refreshable_until: toISOStringSafe(new Date(refreshExpiresTime)),
  };
  // 8. Build organization memberships with proper relation includes
  const orgMemberships =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_member_id: decoded.id,
        deleted_at: null,
      },
      include: {
        member: {
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
            owner_id: true,
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
                owner_id: true,
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
          },
        },
      },
    });
  const transformedMemberships: IHrmsOrganizationMember.ISummary[] =
    orgMemberships.map((om) => {
      const memberData = om.member;
      const orgData = om.organization;
      const roleData = om.organizationRole;
      const memberDateDeleted = memberData.deleted_at
        ? toISOStringSafe(memberData.deleted_at)
        : null;
      const orgDateDeleted = orgData.deleted_at
        ? toISOStringSafe(orgData.deleted_at)
        : null;
      const membershipDateDeleted = om.deleted_at
        ? toISOStringSafe(om.deleted_at)
        : null;
      const ownerData = orgData.owner;
      const ownerDateDeleted = ownerData?.deleted_at
        ? toISOStringSafe(ownerData.deleted_at)
        : null;
      const roleDateCreated = toISOStringSafe(roleData.created_at);
      const roleDateUpdated = toISOStringSafe(roleData.updated_at);
      const roleOwner = roleData.organization.owner;
      const roleOwnerDateDeleted = roleOwner?.deleted_at
        ? toISOStringSafe(roleOwner.deleted_at)
        : null;
      const roleOrgDateDeleted = roleData.organization.deleted_at
        ? toISOStringSafe(roleData.organization.deleted_at)
        : null;
      return {
        id: om.id,
        member: {
          id: memberData.id,
          display_name: memberData.display_name,
          avatar_uri: memberData.avatar_uri,
          phone_number: memberData.phone_number,
          email: memberData.email,
          organization_membership_count: 0,
          created_at: toISOStringSafe(memberData.created_at),
          updated_at: toISOStringSafe(memberData.updated_at),
          deleted_at: memberDateDeleted,
        },
        organization: {
          id: orgData.id,
          name: orgData.name,
          description: orgData.description,
          logo_uri: orgData.logo_uri,
          currency: orgData.currency,
          timezone: orgData.timezone,
          fiscal_start_month: orgData.fiscal_start_month,
          owner: {
            id: ownerData?.id ?? "",
            display_name: ownerData?.display_name ?? "",
            avatar_uri: ownerData?.avatar_uri ?? null,
            phone_number: ownerData?.phone_number ?? null,
            email: ownerData?.email ?? "",
            organization_membership_count: 0,
            created_at: ownerData?.created_at
              ? toISOStringSafe(ownerData.created_at)
              : nowIso,
            updated_at: ownerData?.updated_at
              ? toISOStringSafe(ownerData.updated_at)
              : nowIso,
            deleted_at: ownerDateDeleted,
          },
          created_at: toISOStringSafe(orgData.created_at),
          updated_at: toISOStringSafe(orgData.updated_at),
          deleted_at: orgDateDeleted,
        },
        organizationRole: {
          id: roleData.id,
          name: roleData.name,
          is_builtin: roleData.is_builtin,
          organization: {
            id: roleData.organization.id,
            name: roleData.organization.name,
            description: roleData.organization.description,
            logo_uri: roleData.organization.logo_uri,
            currency: roleData.organization.currency,
            timezone: roleData.organization.timezone,
            fiscal_start_month: roleData.organization.fiscal_start_month,
            owner: {
              id: roleOwner?.id ?? "",
              display_name: roleOwner?.display_name ?? "",
              avatar_uri: roleOwner?.avatar_uri ?? null,
              phone_number: roleOwner?.phone_number ?? null,
              email: roleOwner?.email ?? "",
              organization_membership_count: 0,
              created_at: roleOwner?.created_at
                ? toISOStringSafe(roleOwner.created_at)
                : nowIso,
              updated_at: roleOwner?.updated_at
                ? toISOStringSafe(roleOwner.updated_at)
                : nowIso,
              deleted_at: roleOwnerDateDeleted,
            },
            created_at: toISOStringSafe(roleData.organization.created_at),
            updated_at: toISOStringSafe(roleData.organization.updated_at),
            deleted_at: roleOrgDateDeleted,
          },
          created_at: roleDateCreated,
          updated_at: roleDateUpdated,
          members_count: 0,
        },
        created_at: toISOStringSafe(om.created_at),
        updated_at: toISOStringSafe(om.updated_at),
        deleted_at: membershipDateDeleted,
      };
    });
  // 9. Return authorized member state
  const memberDateDeleted = member.deleted_at
    ? toISOStringSafe(member.deleted_at)
    : null;
  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    avatar_uri: member.avatar_uri,
    phone_number: member.phone_number,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: memberDateDeleted,
    organization_memberships: transformedMemberships,
    token: token,
  };
}
