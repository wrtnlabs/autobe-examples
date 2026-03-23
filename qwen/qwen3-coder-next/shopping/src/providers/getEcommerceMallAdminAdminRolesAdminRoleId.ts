import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRoleTransformer } from "../transformers/EcommerceMallAdminRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminRolesAdminRoleId(props: {
  admin: AdminPayload;
  adminRoleId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRole> {
  const role =
    await MyGlobal.prisma.ecommerce_mall_admin_roles.findUniqueOrThrow({
      where: { id: props.adminRoleId },
      ...EcommerceMallAdminRoleTransformer.select(),
    });
  const hasPermission =
    role.admin.grade === "super" || role.admin.id === props.admin.id;
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallAdminRoleTransformer.transform(role);
}
