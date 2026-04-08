import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmPlatformMemberMembershipsMembershipId(props: {
  member: MemberPayload;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findUniqueOrThrow(
      {
        where: {
          id: props.membershipId,
          deleted_at: null,
        },
      },
    );
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: {
        member_id_organization_id: {
          member_id: membership.hrm_platform_member_id,
          organization_id: membership.hrm_platform_organization_id,
        },
        deleted_at: null,
      },
    });
  const isSelfRemoval = membership.hrm_platform_member_id === props.member.id;
  if (!isSelfRemoval) {
    const hasOrgManagePermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: employee.role_id,
          permission: {
            code: "org:manage",
            deleted_at: null,
          },
        },
      });
    if (!hasOrgManagePermission) {
      throw new HttpException(
        "Forbidden: Requires org:manage permission or self-removal",
        403,
      );
    }
  }
  if (membership.is_owner) {
    const otherActiveOwners =
      await MyGlobal.prisma.hrm_platform_organization_memberships.count({
        where: {
          hrm_platform_organization_id: membership.hrm_platform_organization_id,
          is_owner: true,
          id: {
            not: props.membershipId,
          },
          deleted_at: null,
        },
      });
    if (otherActiveOwners === 0) {
      throw new HttpException(
        "Cannot remove sole owner. Transfer ownership to another member first.",
        400,
      );
    }
  }
  await MyGlobal.prisma.hrm_platform_organization_memberships.update({
    where: {
      id: props.membershipId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.hrm_platform_employees.update({
    where: {
      id: employee.id,
    },
    data: {
      status: "deactivated",
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
