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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminDepartments(props: {
  admin: AdminPayload;
  body: IErpHrmDepartment.ICreate;
}): Promise<IErpHrmDepartment> {
  // Verify admin session exists
  await MyGlobal.prisma.erp_hrm_admin_sessions.findFirstOrThrow({
    where: {
      id: props.admin.session_id,
      erp_hrm_admin_id: props.admin.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });
  // Get admin's organization by finding organization where admin is owner
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
      where: { owner_id: props.admin.id },
      select: { id: true },
    });
  // Validate parent department if provided
  if (props.body.parent_id) {
    const parentDept = await MyGlobal.prisma.erp_hrm_departments.findUnique({
      where: { id: props.body.parent_id },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        parent_id: true,
      },
    });
    if (!parentDept) {
      throw new HttpException("Parent department not found", 400);
    }
    if (parentDept.erp_hrm_organization_id !== organization.id) {
      throw new HttpException(
        "Parent department must belong to the same organization",
        400,
      );
    }
    if (parentDept.parent_id !== null) {
      throw new HttpException(
        "Cannot create department under a non-root department (one-level hierarchy only)",
        400,
      );
    }
  }
  // Check for duplicate department name within organization
  const existingDept = await MyGlobal.prisma.erp_hrm_departments.findUnique({
    where: {
      erp_hrm_organization_id_name: {
        erp_hrm_organization_id: organization.id,
        name: props.body.name,
      },
    },
  });
  if (existingDept && existingDept.deleted_at === null) {
    throw new HttpException(
      "Department with this name already exists in the organization",
      409,
    );
  }
  // Create department using collector
  const created = await MyGlobal.prisma.erp_hrm_departments.create({
    data: await ErpHrmDepartmentCollector.collect({
      body: props.body,
      erpHrmOrganizations: organization,
    }),
    ...ErpHrmDepartmentTransformer.select(),
  });
  // Return transformed response
  return await ErpHrmDepartmentTransformer.transform(created);
}
