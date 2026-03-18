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

export async function deleteErpHrmMemberOrganizationsOrganizationIdLogo(props: {
  member: MemberPayload;
  organizationId: string;
}): Promise<void> {
  // Find organization and verify ownership
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        owner_id: true,
        logo_url: true,
      },
    });
  // Verify requesting member is the owner
  if (organization.owner_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // If no logo exists, nothing to do
  if (organization.logo_url === null) {
    return;
  }
  // Clear the logo
  await MyGlobal.prisma.erp_hrm_organizations.update({
    where: { id: props.organizationId },
    data: {
      logo_url: null,
      updated_at: new Date(),
    },
  });
}
