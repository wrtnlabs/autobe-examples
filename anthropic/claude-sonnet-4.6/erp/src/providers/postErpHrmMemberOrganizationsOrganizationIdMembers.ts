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
import { ErpHrmOrganizationMemberCollector } from "../collectors/ErpHrmOrganizationMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberTransformer } from "../transformers/ErpHrmOrganizationMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationsOrganizationIdMembers(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmOrganizationMember.ICreate;
}): Promise<IErpHrmOrganizationMember> {
  // 1. Verify the organization exists and is not deleted
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 2. Verify the target platform user account exists and is not deleted
  await MyGlobal.prisma.erp_hrm_members.findFirstOrThrow({
    where: {
      id: props.body.memberId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // 3. Verify the role exists and is scoped to the same organization
  await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      id: props.body.roleId,
      erp_hrm_organization_id: props.organizationId,
    },
    select: { id: true },
  });
  // 4. If departmentId is provided, verify it belongs to the same organization and is not deleted
  if (props.body.departmentId != null) {
    await MyGlobal.prisma.erp_hrm_departments.findFirstOrThrow({
      where: {
        id: props.body.departmentId,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
  }
  // 5. Check for duplicate active membership (@@unique([organization_id, member_id]))
  const existing = await MyGlobal.prisma.erp_hrm_organization_members.findFirst(
    {
      where: {
        organization_id: props.organizationId,
        member_id: props.body.memberId,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (existing !== null) {
    throw new HttpException(
      "The specified user is already an active member of this organization",
      409,
    );
  }
  // 6. Create the organization member record using Collector + Transformer pattern
  const created = await MyGlobal.prisma.erp_hrm_organization_members.create({
    data: await ErpHrmOrganizationMemberCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: props.organizationId },
      erpHrmMembers: { id: props.member.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmOrganizationMemberTransformer.select(),
  });
  return ErpHrmOrganizationMemberTransformer.transform(created);
}
