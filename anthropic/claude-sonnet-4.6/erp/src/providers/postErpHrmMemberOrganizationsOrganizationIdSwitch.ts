import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberTransformer } from "../transformers/ErpHrmOrganizationMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationsOrganizationIdSwitch(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmOrganizationMember> {
  // Step 1: Verify target organization exists and is not deleted
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Find the organization member record for the caller
  const membership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true, status: true },
    });
  // Step 3: Deny if caller is not a member of the target organization
  if (membership === null) {
    throw new HttpException(
      "Forbidden: not a member of the target organization",
      403,
    );
  }
  // Step 4: Deny if member is deactivated in the target organization
  if (membership.status !== "active") {
    throw new HttpException(
      "Forbidden: member is deactivated in the target organization",
      403,
    );
  }
  // Step 5: Load the full OrganizationMember record for the response
  const record =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: membership.id },
      ...ErpHrmOrganizationMemberTransformer.select(),
    });
  // Step 6: Transform and return the result
  return ErpHrmOrganizationMemberTransformer.transform(record);
}
