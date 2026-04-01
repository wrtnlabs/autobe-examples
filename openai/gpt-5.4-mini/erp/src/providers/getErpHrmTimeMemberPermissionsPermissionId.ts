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
import { ErpHrmTimePermissionTransformer } from "../transformers/ErpHrmTimePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberPermissionsPermissionId(props: {
  member: MemberPayload;
  permissionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimePermission> {
  const permission =
    await MyGlobal.prisma.erp_hrm_time_permissions.findFirstOrThrow({
      where: {
        id: props.permissionId,
        deleted_at: null,
      },
      ...ErpHrmTimePermissionTransformer.select(),
    });
  return await ErpHrmTimePermissionTransformer.transform(permission);
}
