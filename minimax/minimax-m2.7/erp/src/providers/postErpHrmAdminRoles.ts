import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmRoleCollector } from "../collectors/ErpHrmRoleCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminRoles(props: {
  admin: AdminPayload;
  body: IErpHrmRole.ICreate;
}): Promise<IErpHrmRole> {
  // Admin is a system-wide admin, not org-scoped.
  // Get the first available organization (system design assumption).
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    select: { id: true },
  });
  if (!organization) {
    throw new HttpException("No organization found", 400);
  }
  // Check for duplicate role name within organization (unique constraint)
  const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      erp_hrm_organization_id: organization.id,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingRole !== null) {
    throw new HttpException(
      `Role with name '${props.body.name}' already exists in this organization`,
      409,
    );
  }
  // Collect role data and create with permissions
  const created = await MyGlobal.prisma.erp_hrm_roles.create({
    data: await ErpHrmRoleCollector.collect({
      body: props.body,
      organization: organization,
    }),
    ...ErpHrmRoleTransformer.select(),
  });
  // Transform and return complete role with permissions
  return await ErpHrmRoleTransformer.transform(created);
}
