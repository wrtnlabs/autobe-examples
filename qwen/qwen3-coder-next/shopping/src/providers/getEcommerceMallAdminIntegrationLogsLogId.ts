import { IEcommerceMallIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallIntegrationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallIntegrationLogTransformer } from "../transformers/EcommerceMallIntegrationLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminIntegrationLogsLogId(props: {
  admin: AdminPayload;
  logId: string;
}): Promise<IEcommerceMallIntegrationLog> {
  const record =
    await MyGlobal.prisma.ecommerce_mall_integration_logs.findUniqueOrThrow({
      where: { id: props.logId },
      ...EcommerceMallIntegrationLogTransformer.select(),
    });
  return await EcommerceMallIntegrationLogTransformer.transform(record);
}
