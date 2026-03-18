import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmDepartmentCollector } from "../collectors/ErpHrmDepartmentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmDepartment.ICreate;
}): Promise<IErpHrmDepartment> {
  // Get member with organization context
  const memberWithOrg = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow(
    {
      where: { id: props.member.id },
      select: {
        organizationMembers: {
          where: { deleted_at: null },
          take: 1,
          select: {
            organization_id: true,
          },
        },
      },
    },
  );
  const orgMembership = memberWithOrg.organizationMembers[0];
  if (!orgMembership) {
    throw new HttpException(
      "Member is not associated with any organization",
      400,
    );
  }
  const organizationId = orgMembership.organization_id;
  // Check uniqueness - case-insensitive name check within organization
  const existing = await MyGlobal.prisma.erp_hrm_departments.findFirst({
    where: {
      organization_id: organizationId,
      name: { equals: props.body.name, mode: "insensitive" },
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Department with this name already exists", 409);
  }
  // Validate parent department if provided
  if (props.body.parentDepartmentId) {
    const parent = await MyGlobal.prisma.erp_hrm_departments.findUnique({
      where: { id: props.body.parentDepartmentId },
      select: {
        id: true,
        organization_id: true,
        parent_department_id: true,
      },
    });
    if (!parent) {
      throw new HttpException("Parent department not found", 400);
    }
    if (parent.organization_id !== organizationId) {
      throw new HttpException(
        "Parent department does not belong to this organization",
        400,
      );
    }
    if (parent.parent_department_id !== null) {
      throw new HttpException(
        "Parent department already has a parent - single-level nesting only",
        400,
      );
    }
  }
  // Create department using collector
  const createInput = await ErpHrmDepartmentCollector.collect({
    body: props.body,
    erpHrmOrganizations: { id: organizationId },
  });
  const created = await MyGlobal.prisma.erp_hrm_departments.create({
    data: createInput,
    ...ErpHrmDepartmentTransformer.select(),
  });
  return await ErpHrmDepartmentTransformer.transform(created);
}
