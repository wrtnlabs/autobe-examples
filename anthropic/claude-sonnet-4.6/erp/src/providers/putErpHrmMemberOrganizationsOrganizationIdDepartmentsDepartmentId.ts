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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
  body: IErpHrmDepartment.IUpdate;
}): Promise<IErpHrmDepartment> {
  // Step 1: Verify membership in the organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            permissions: {
              select: { permission_code: true },
            },
          },
        },
      },
    });
  if (orgMember === null) {
    throw new HttpException(
      "Forbidden: You are not a member of this organization",
      403,
    );
  }
  // Step 2: Check org:manage permission
  const hasOrgManage = orgMember.role.permissions.some(
    (p) => p.permission_code === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden: org:manage permission required", 403);
  }
  // Step 3: Look up the target department scoped to the organization
  const department = await MyGlobal.prisma.erp_hrm_departments.findFirst({
    where: {
      id: props.departmentId,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (department === null) {
    throw new HttpException("Not Found: Department not found", 404);
  }
  // Step 4a: Validate name uniqueness (exclude self)
  const nameConflict = await MyGlobal.prisma.erp_hrm_departments.findFirst({
    where: {
      organization_id: props.organizationId,
      name: props.body.name,
      deleted_at: null,
      NOT: { id: props.departmentId },
    },
    select: { id: true },
  });
  if (nameConflict !== null) {
    throw new HttpException(
      "Unprocessable Entity: Department name already exists in this organization",
      422,
    );
  }
  // Step 4b: Validate parentId if explicitly provided
  let resolvedParentId: (string & tags.Format<"uuid">) | null = null;
  if (props.body.parentId !== undefined && props.body.parentId !== null) {
    const parentId = props.body.parentId;
    // Cannot self-reference
    if (parentId === props.departmentId) {
      throw new HttpException(
        "Unprocessable Entity: A department cannot be its own parent",
        422,
      );
    }
    // Parent must exist in same org and not be soft-deleted
    const parentDept = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: parentId,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true, parent_id: true },
    });
    if (parentDept === null) {
      throw new HttpException(
        "Unprocessable Entity: Parent department not found in this organization",
        422,
      );
    }
    // Parent must itself be a top-level department (no parent of its own)
    if (parentDept.parent_id !== null) {
      throw new HttpException(
        "Unprocessable Entity: Parent department must be a top-level department",
        422,
      );
    }
    // Current department must not have active children (would create 2-level nesting)
    const childCount = await MyGlobal.prisma.erp_hrm_departments.count({
      where: {
        parent_id: props.departmentId,
        deleted_at: null,
      },
    });
    if (childCount > 0) {
      throw new HttpException(
        "Unprocessable Entity: Cannot assign a parent to a department that already has children",
        422,
      );
    }
    resolvedParentId = parentId;
  }
  // Step 5: Perform the UPDATE
  // - description: only update when explicitly provided (undefined = leave unchanged)
  // - parent_id: only update when explicitly provided (undefined = leave unchanged)
  await MyGlobal.prisma.erp_hrm_departments.update({
    where: { id: props.departmentId },
    data: {
      name: props.body.name,
      description:
        props.body.description !== undefined
          ? (props.body.description ?? null)
          : undefined,
      parent_id:
        props.body.parentId !== undefined ? resolvedParentId : undefined,
      updated_at: new Date(),
    },
  });
  // Step 6: Fetch and return the updated record via transformer
  const updated = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    ...ErpHrmDepartmentTransformer.select(),
  });
  return ErpHrmDepartmentTransformer.transform(updated);
}
