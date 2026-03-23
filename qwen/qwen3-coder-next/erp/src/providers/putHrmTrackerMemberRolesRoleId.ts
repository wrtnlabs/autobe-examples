import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerRoleTransformer } from "../transformers/HrmTrackerRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTrackerMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string;
  body: IHrmTrackerRole.IUpdate;
}): Promise<IHrmTrackerRole> {
  const role = await MyGlobal.prisma.hrm_tracker_roles.findFirst({
    where: { id: props.roleId, deleted_at: null },
    select: {
      id: true,
      hrm_tracker_organization_id: true,
      is_custom: true,
      is_default: true,
      name: true,
      employees: { select: { id: true } },
    },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  if (!role.is_custom) {
    throw new HttpException("Built-in role cannot be updated", 400);
  }
  const duplicate = await MyGlobal.prisma.hrm_tracker_roles.findFirst({
    where: {
      hrm_tracker_organization_id: role.hrm_tracker_organization_id,
      name: props.body.name,
      id: { not: { equals: props.roleId } },
      deleted_at: null,
    },
  });
  if (duplicate) {
    throw new HttpException("Role name already exists", 409);
  }
  const updated = await MyGlobal.prisma.hrm_tracker_roles.update({
    where: { id: props.roleId },
    data: {
      name: props.body.name,
      description: props.body.description ?? null,
      is_custom: props.body.is_custom ?? role.is_custom,
      is_default: props.body.is_default ?? role.is_default,
      updated_at: new Date(),
    },
    ...HrmTrackerRoleTransformer.select(),
  });
  return await HrmTrackerRoleTransformer.transform(updated);
}
