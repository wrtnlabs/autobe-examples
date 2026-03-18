import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsFileUploadRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUploadRequest";
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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberAvatar(props: {
  member: MemberPayload;
  body: IHrmsFileUploadRequest;
}): Promise<IHrmsMember> {
  const fileContentType = props.body.file_type;
  const fileOriginalName = props.body.original_filename;
  const getExtension = (mime: string): string => {
    switch (mime) {
      case "image/png":
        return "png";
      case "image/jpeg":
        return "jpg";
      case "image/gif":
        return "gif";
      default:
        return "png";
    }
  };
  const extension = fileContentType ? getExtension(fileContentType) : "png";
  const fileUuid = v4() as string;
  const storagePath = `/avatars/${fileUuid}.${extension}`;
  const now = new Date();
  const firstOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: { hrms_organization_id: true },
    });
  if (!firstOrgMember) {
    throw new HttpException(
      "Member must belong to at least one organization",
      400,
    );
  }
  const file = await MyGlobal.prisma.hrms_files.create({
    data: {
      id: fileUuid,
      organization_id: firstOrgMember.hrms_organization_id,
      owner_id: props.member.id,
      owner_type: "member",
      file_category: "user_avatar",
      filename: fileOriginalName ?? `avatar.${extension}`,
      storage_path: storagePath,
      mime_type: fileContentType ?? "image/png",
      file_size: 0,
      validation_status: "validated",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const previousAvatar = await MyGlobal.prisma.hrms_files.findFirst({
    where: {
      owner_id: props.member.id,
      owner_type: "member",
      file_category: "user_avatar",
      deleted_at: null,
    },
  });
  if (previousAvatar) {
    await MyGlobal.prisma.hrms_files.update({
      where: { id: previousAvatar.id },
      data: { deleted_at: now },
    });
  }
  const updatedMember = await MyGlobal.prisma.hrms_members.update({
    where: { id: props.member.id },
    data: {
      avatar_uri: storagePath,
      updated_at: now,
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
      organizationMembers: {
        select: {
          id: true,
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
                  email: true,
                  display_name: true,
                  avatar_uri: true,
                  phone_number: true,
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
                },
              },
            },
          },
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const organizationMemberships = await ArrayUtil.asyncMap(
    updatedMember.organizationMembers,
    async (membership) => {
      const memberSummary = {
        id: membership.member.id,
        email: membership.member.email,
        display_name: membership.member.display_name,
        avatar_uri: membership.member.avatar_uri ?? null,
        phone_number: membership.member.phone_number ?? null,
        organization_membership_count: 1,
        created_at: membership.member.created_at.toISOString(),
        updated_at: membership.member.updated_at.toISOString(),
        deleted_at: membership.member.deleted_at?.toISOString() ?? null,
      } satisfies IHrmsMember.ISummary;
      const organizationSummary = {
        id: membership.organization.id,
        name: membership.organization.name,
        description: membership.organization.description ?? null,
        logo_uri: membership.organization.logo_uri ?? null,
        currency: membership.organization.currency,
        timezone: membership.organization.timezone,
        fiscal_start_month: membership.organization.fiscal_start_month,
        owner: {
          id: membership.organization.owner.id,
          email: membership.organization.owner.email,
          display_name: membership.organization.owner.display_name,
          avatar_uri: membership.organization.owner.avatar_uri ?? null,
          phone_number: membership.organization.owner.phone_number ?? null,
          organization_membership_count: 0,
          created_at: membership.organization.owner.created_at.toISOString(),
          updated_at: membership.organization.owner.updated_at.toISOString(),
          deleted_at:
            membership.organization.owner.deleted_at?.toISOString() ?? null,
        } satisfies IHrmsMember.ISummary,
        created_at: membership.organization.created_at.toISOString(),
        updated_at: membership.organization.updated_at.toISOString(),
        deleted_at: membership.organization.deleted_at?.toISOString() ?? null,
      } satisfies IHrmsOrganization.ISummary;
      const organizationRoleSummary = {
        id: membership.organizationRole.id,
        name: membership.organizationRole.name,
        is_builtin: membership.organizationRole.is_builtin,
        members_count: 0,
        organization: {
          id: membership.organizationRole.organization.id,
          name: membership.organizationRole.organization.name,
          description:
            membership.organizationRole.organization.description ?? null,
          logo_uri: membership.organizationRole.organization.logo_uri ?? null,
          currency: membership.organizationRole.organization.currency,
          timezone: membership.organizationRole.organization.timezone,
          fiscal_start_month:
            membership.organizationRole.organization.fiscal_start_month,
          owner: {
            id: membership.organizationRole.organization.owner.id,
            email: membership.organizationRole.organization.owner.email,
            display_name:
              membership.organizationRole.organization.owner.display_name,
            avatar_uri:
              membership.organizationRole.organization.owner.avatar_uri ?? null,
            phone_number:
              membership.organizationRole.organization.owner.phone_number ??
              null,
            organization_membership_count: 0,
            created_at:
              membership.organizationRole.organization.owner.created_at.toISOString(),
            updated_at:
              membership.organizationRole.organization.owner.updated_at.toISOString(),
            deleted_at:
              membership.organizationRole.organization.owner.deleted_at?.toISOString() ??
              null,
          } satisfies IHrmsMember.ISummary,
          created_at:
            membership.organizationRole.organization.created_at.toISOString(),
          updated_at:
            membership.organizationRole.organization.updated_at.toISOString(),
          deleted_at:
            membership.organizationRole.organization.deleted_at?.toISOString() ??
            null,
        } satisfies IHrmsOrganization.ISummary,
        created_at: membership.organizationRole.created_at.toISOString(),
        updated_at: membership.organizationRole.updated_at.toISOString(),
      } satisfies IHrmsOrganizationRole.ISummary;
      return {
        id: membership.id,
        member: memberSummary,
        organization: organizationSummary,
        organizationRole: organizationRoleSummary,
        created_at: membership.created_at.toISOString(),
        updated_at: membership.updated_at.toISOString(),
        deleted_at: membership.deleted_at?.toISOString() ?? null,
      } satisfies IHrmsOrganizationMember.ISummary;
    },
  );
  return {
    id: updatedMember.id,
    email: updatedMember.email,
    display_name: updatedMember.display_name,
    avatar_uri: updatedMember.avatar_uri ?? null,
    phone_number: updatedMember.phone_number ?? null,
    created_at: updatedMember.created_at.toISOString(),
    updated_at: updatedMember.updated_at.toISOString(),
    deleted_at: updatedMember.deleted_at?.toISOString() ?? null,
    organization_memberships: organizationMemberships,
  } satisfies IHrmsMember;
}
