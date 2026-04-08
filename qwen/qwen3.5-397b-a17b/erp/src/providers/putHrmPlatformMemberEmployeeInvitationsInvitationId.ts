import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeInvitationTransformer } from "../transformers/HrmPlatformEmployeeInvitationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberEmployeeInvitationsInvitationId(props: {
  member: MemberPayload;
  invitationId: string & tags.Format<"uuid">;
  body: IHrmPlatformEmployeeInvitation.IUpdate;
}): Promise<IHrmPlatformEmployeeInvitation> {
  const invitation =
    await MyGlobal.prisma.hrm_platform_employee_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      select: {
        id: true,
        organization_id: true,
        status: true,
      },
    });
  if (invitation.status !== "pending") {
    throw new HttpException("Only pending invitations can be updated", 400);
  }
  if (props.body.role_id !== undefined) {
    const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
      where: { id: props.body.role_id },
      select: { id: true, organization_id: true },
    });
    if (!role || role.organization_id !== invitation.organization_id) {
      throw new HttpException("Invalid role_id", 400);
    }
  }
  if (props.body.department_id !== undefined) {
    if (props.body.department_id !== null) {
      const department =
        await MyGlobal.prisma.hrm_platform_departments.findUnique({
          where: { id: props.body.department_id },
          select: { id: true, hrm_platform_organization_id: true },
        });
      if (
        !department ||
        department.hrm_platform_organization_id !== invitation.organization_id
      ) {
        throw new HttpException("Invalid department_id", 400);
      }
    }
  }
  if (props.body.employment_type !== undefined) {
    const validTypes = [
      "full-time",
      "part-time",
      "contractor",
      "intern",
    ] as const;
    if (!validTypes.includes(props.body.employment_type)) {
      throw new HttpException("Invalid employment_type", 400);
    }
  }
  if (props.body.expires_at !== undefined) {
    const expiresAt = new Date(props.body.expires_at);
    if (expiresAt <= new Date()) {
      throw new HttpException("expires_at must be in the future", 400);
    }
  }
  await MyGlobal.prisma.hrm_platform_employee_invitations.update({
    where: { id: props.invitationId },
    data: {
      ...(props.body.role_id !== undefined && {
        role: { connect: { id: props.body.role_id } },
      }),
      ...(props.body.department_id !== undefined && {
        department:
          props.body.department_id === null
            ? { disconnect: true }
            : { connect: { id: props.body.department_id } },
      }),
      ...(props.body.position !== undefined && {
        position: props.body.position,
      }),
      ...(props.body.employment_type !== undefined && {
        employment_type: props.body.employment_type,
      }),
      ...(props.body.expires_at !== undefined && {
        expires_at: new Date(props.body.expires_at),
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_employee_invitations.findUniqueOrThrow({
      where: { id: props.invitationId },
      ...HrmPlatformEmployeeInvitationTransformer.select(),
    });
  return await HrmPlatformEmployeeInvitationTransformer.transform(updated);
}
