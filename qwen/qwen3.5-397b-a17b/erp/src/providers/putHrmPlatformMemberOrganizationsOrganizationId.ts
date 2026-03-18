import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationTransformer } from "../transformers/HrmPlatformOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganization.IUpdate;
}): Promise<IHrmPlatformOrganization> {
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, owner_id: true },
    });
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_platform_organizations.update({
    where: { id: props.organizationId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.logo_url !== undefined && {
        logo_url: props.body.logo_url,
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
  const updated =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmPlatformOrganizationTransformer.select(),
    });
  return await HrmPlatformOrganizationTransformer.transform(updated);
}
