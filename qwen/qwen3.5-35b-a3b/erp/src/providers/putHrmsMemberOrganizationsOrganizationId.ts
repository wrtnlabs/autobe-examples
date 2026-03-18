import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
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

export async function putHrmsMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsOrganization.IUpdate;
}): Promise<IHrmsOrganization> {
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirstOrThrow({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
  });
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirstOrThrow({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: props.organizationId,
        deleted_at: null,
      },
    });
  const organizationRole =
    await MyGlobal.prisma.hrms_organization_roles.findFirstOrThrow({
      where: {
        id: organizationMember.hrms_organization_role_id,
      },
    });
  const hasManagementPermission =
    organizationRole.name === "Owner" || organizationRole.name === "Manager";
  if (!hasManagementPermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    const existingOrg = await MyGlobal.prisma.hrms_organizations.findUnique({
      where: {
        name: props.body.name,
      },
    });
    if (existingOrg !== null && existingOrg.id !== props.organizationId) {
      throw new HttpException("Organization name already exists", 400);
    }
  }
  await MyGlobal.prisma.hrms_organizations.update({
    where: { id: props.organizationId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.logo_uri !== undefined && {
        logo_uri: props.body.logo_uri,
      }),
      ...(props.body.currency !== undefined && {
        currency: props.body.currency,
      }),
      ...(props.body.timezone !== undefined && {
        timezone: props.body.timezone,
      }),
      ...(props.body.fiscal_start_month !== undefined && {
        fiscal_start_month: props.body.fiscal_start_month,
      }),
      updated_at: new Date(),
    },
  });
  const result: IHrmsOrganization = {
    totalActiveEmployees: 0 satisfies number & tags.Type<"int32">,
    totalHoursThisWeek: 0,
    pendingTimesheetsCount: 0 satisfies number & tags.Type<"int32">,
    projectsOverBudget: [],
    topEmployees: [],
    generatedAt: new Date().toISOString(),
  };
  return result;
}
