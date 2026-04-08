import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberRolesPermissionsCatalog(props: {
  member: MemberPayload;
}): Promise<IErpHrmTimePermission> {
  void props.member;
  const permissions = await MyGlobal.prisma.erp_hrm_time_permissions.findMany({
    orderBy: [
      {
        key: "asc",
      },
      {
        created_at: "asc",
      },
    ],
    select: {
      key: true,
      description: true,
    },
  });
  return {
    items: permissions.length > 0,
  };
}
