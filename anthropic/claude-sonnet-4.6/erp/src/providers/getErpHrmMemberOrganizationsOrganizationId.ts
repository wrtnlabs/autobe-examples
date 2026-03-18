import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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
import { ErpHrmOrganizationTransformer } from "../transformers/ErpHrmOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmOrganization> {
  // Step 1: Verify the requesting member belongs to the target organization
  // This enforces strict per-organization data isolation
  const membership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: props.organizationId,
      },
      select: { id: true },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Fetch the full organization record, excluding soft-deleted ones
  // findFirstOrThrow automatically returns 404 if no record matches
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      ...ErpHrmOrganizationTransformer.select(),
    });
  // Step 3: Transform DB record into the IErpHrmOrganization response DTO
  return ErpHrmOrganizationTransformer.transform(organization);
}
