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

export async function getHrmsMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmsOrganization.ISummary> {
  // Check if user is a member of this organization
  const membership = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_organization_id: props.organizationId,
      hrms_member_id: props.member.id,
      deleted_at: null,
    },
  });
  if (membership === null) {
    throw new HttpException("Not found", 404);
  }
  // Fetch organization with full details including owner
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: props.organizationId, deleted_at: null },
      select: {
        id: true,
        owner_id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: organization.id,
    owner_id: organization.owner_id as string & tags.Format<"uuid">,
    name: organization.name,
    description: organization.description ?? null,
    logo_uri: organization.logo_uri ?? null,
    currency: organization.currency,
    timezone: organization.timezone,
    fiscal_start_month: organization.fiscal_start_month,
    created_at: organization.created_at.toISOString(),
    updated_at: organization.updated_at.toISOString(),
    deleted_at: organization.deleted_at?.toISOString() ?? null,
  } satisfies IHrmsOrganization.ISummary;
}
