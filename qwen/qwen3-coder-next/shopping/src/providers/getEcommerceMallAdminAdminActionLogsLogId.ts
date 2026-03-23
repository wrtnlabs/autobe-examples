import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminActionLogTransformer } from "../transformers/EcommerceMallAdminActionLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminAdminActionLogsLogId(props: {
  admin: AdminPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminActionLog> {
  const log =
    await MyGlobal.prisma.ecommerce_mall_admin_action_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...EcommerceMallAdminActionLogTransformer.select(),
    });
  return await EcommerceMallAdminActionLogTransformer.transform(log);
}
