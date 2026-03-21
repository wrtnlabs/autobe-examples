import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { IErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmAdminSessionTransformer } from "../transformers/ErpHrmAdminSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminAdminSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmAdminSession> {
  const session =
    await MyGlobal.prisma.erp_hrm_admin_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...ErpHrmAdminSessionTransformer.select(),
    });
  return await ErpHrmAdminSessionTransformer.transform(session);
}
