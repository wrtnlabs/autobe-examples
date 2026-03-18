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

export async function getErpHrmMemberOrganizationMembersOrganizationMemberId(props: {
  member: MemberPayload;
  organizationMemberId: string & tags.Format<"uuid">;
}): Promise<IErpHrmOrganizationMember> {
  // Step 1: Look up the target organization member record by primary key
  // findUniqueOrThrow automatically returns 404 if the record does not exist
  const target =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: props.organizationMemberId },
      select: {
        id: true,
        organization_id: true,
        deleted_at: true,
      },
    });
  // Step 2: Treat soft-deleted records as non-existent
  if (target.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // Step 3: Verify the requesting member belongs to the same organization
  const callerMembership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: target.organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (callerMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Fetch the full record with all nested relations via transformer
  const record =
    await MyGlobal.prisma.erp_hrm_organization_members.findUniqueOrThrow({
      where: { id: props.organizationMemberId },
      ...ErpHrmOrganizationMemberTransformer.select(),
    });
  // Step 5: Transform and return the response DTO
  return ErpHrmOrganizationMemberTransformer.transform(record);
}
