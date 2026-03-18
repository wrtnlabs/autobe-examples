import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberAtSummaryTransformer } from "../transformers/HrmsMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberOrganizationsSwitch(props: {
  member: MemberPayload;
  body: IHrmsOrganization.IRequest;
}): Promise<IHrmsOrganization.ISummary> {
  const requestBody = props.body as unknown as {
    organization_id?: string;
  };
  const targetOrganizationId = requestBody.organization_id;
  if (!targetOrganizationId) {
    throw new HttpException("Organization ID is required", 400);
  }
  const organizationId = typia.assert<string & tags.Format<"uuid">>(
    targetOrganizationId,
  );
  const membership = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id as string & tags.Format<"uuid">,
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (membership === null) {
    throw new HttpException(
      "You do not have membership in the target organization",
      403,
    );
  }
  await MyGlobal.prisma.hrms_member_sessions.update({
    where: { id: props.member.session_id },
    data: { current_organization_id: organizationId },
  });
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: organizationId },
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
        owner: HrmsMemberAtSummaryTransformer.select(),
      },
    });
  const result: IHrmsOrganization.ISummary = {
    id: organization.id,
    name: organization.name,
    description: organization.description ?? null,
    logo_uri: organization.logo_uri ?? null,
    currency: organization.currency,
    timezone: organization.timezone,
    fiscal_start_month: organization.fiscal_start_month,
    owner: await HrmsMemberAtSummaryTransformer.transform(organization.owner),
    created_at: toISOStringSafe(organization.created_at),
    updated_at: toISOStringSafe(organization.updated_at),
    deleted_at: organization.deleted_at
      ? toISOStringSafe(organization.deleted_at)
      : null,
  };
  return result;
}
