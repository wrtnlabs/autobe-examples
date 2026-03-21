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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminDepartmentsDepartmentId(props: {
  admin: AdminPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IErpHrmDepartment.IUpdate;
}): Promise<IErpHrmDepartment> {
  // 1. Find the existing department (must exist and not be soft-deleted)
  const existing = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
    where: {
      id: props.departmentId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      name: true,
      parent_id: true,
    },
  });
  // 2. Validate parent_id if provided - must exist in same org and have no parent (one-level hierarchy)
  if (props.body.parent_id !== undefined) {
    if (props.body.parent_id !== null) {
      // Parent is being set - verify it exists and has no parent itself
      const parentDept =
        await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
          where: {
            id: props.body.parent_id,
            deleted_at: null,
          },
          select: {
            id: true,
            erp_hrm_organization_id: true,
            parent_id: true,
          },
        });
      // Verify same organization
      if (
        parentDept.erp_hrm_organization_id !== existing.erp_hrm_organization_id
      ) {
        throw new HttpException(
          "Parent department must belong to the same organization",
          400,
        );
      }
      // Verify parent has no parent itself (one-level hierarchy)
      if (parentDept.parent_id !== null) {
        throw new HttpException(
          "Cannot set parent: parent department already has a parent (one-level hierarchy only)",
          400,
        );
      }
      // Cannot set itself as parent
      if (parentDept.id === props.departmentId) {
        throw new HttpException("Cannot set department as its own parent", 400);
      }
    }
  }
  // 3. Check unique name constraint if name is changing
  if (props.body.name !== existing.name) {
    const duplicateName = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        erp_hrm_organization_id: existing.erp_hrm_organization_id,
        name: props.body.name,
        deleted_at: null,
        id: { not: props.departmentId },
      },
    });
    if (duplicateName) {
      throw new HttpException(
        "Department name already exists in this organization",
        400,
      );
    }
  }
  // 4. Build update data - filter out undefined values
  const updateData: {
    name: string;
    description?: string | null;
    parent_id?: (string & tags.Format<"uuid">) | null;
    updated_at: Date;
  } = {
    name: props.body.name,
    updated_at: new Date(),
  };
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.parent_id !== undefined) {
    updateData.parent_id = props.body.parent_id;
  }
  // 5. Update the department
  await MyGlobal.prisma.erp_hrm_departments.update({
    where: { id: props.departmentId },
    data: updateData,
  });
  // 6. Fetch updated department with relations for response
  const updated = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    ...ErpHrmDepartmentTransformer.select(),
  });
  // 7. Transform and return - transformer handles date conversion to ISO strings
  return await ErpHrmDepartmentTransformer.transform(updated);
}
