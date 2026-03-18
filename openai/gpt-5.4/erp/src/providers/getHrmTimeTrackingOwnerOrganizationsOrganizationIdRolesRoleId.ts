import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingRole> {
  await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
    },
    select: {
      id: true,
    },
  });
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      hrm_time_tracking_organization_id: props.organizationId,
    },
    ...HrmTimeTrackingRoleTransformer.select(),
  });
  return await HrmTimeTrackingRoleTransformer.transform(role);
}
