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
import { HrmTimeTrackingRoleCollector } from "../collectors/HrmTimeTrackingRoleCollector";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingOwnerOrganizationsOrganizationIdRoles(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.ICreate;
}): Promise<IHrmTimeTrackingRole> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (
    props.body.name === "Owner" ||
    props.body.name === "Manager" ||
    props.body.name === "Employee"
  ) {
    throw new HttpException(
      "Built-in roles cannot be created through this endpoint",
      400,
    );
  }
  const existing = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      hrm_time_tracking_organization_id: props.organizationId,
      name: props.body.name,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null) {
    throw new HttpException(
      "Role name already exists in this organization",
      409,
    );
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.hrm_time_tracking_roles.create({
      data: await HrmTimeTrackingRoleCollector.collect({
        body: props.body,
        organization,
      }),
      ...HrmTimeTrackingRoleTransformer.select(),
    });
    return await HrmTimeTrackingRoleTransformer.transform(created);
  });
}
