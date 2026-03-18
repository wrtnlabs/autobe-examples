import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformRole> {
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(role);
}
