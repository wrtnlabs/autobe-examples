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
import { HrmTrackerRoleTransformer } from "../transformers/HrmTrackerRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTrackerRolesRoleId(props: {
  roleId: string & tags.Format<"uuid">;
}): Promise<IHrmTrackerRole> {
  const role = await MyGlobal.prisma.hrm_tracker_roles.findUniqueOrThrow({
    where: { id: props.roleId, deleted_at: null },
    ...HrmTrackerRoleTransformer.select(),
  });
  return await HrmTrackerRoleTransformer.transform(role);
}
