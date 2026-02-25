import { IAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdministrator";
import { IEconomicBoardAdministratorAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EconomicBoardAdministratorAuditLogTransformer } from "../transformers/EconomicBoardAdministratorAuditLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardSuperAdministratorAdminAuditLogsLogId(props: {
  superAdministrator: SuperadministratorPayload;
  logId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardAdministratorAuditLog> {
  const log =
    await MyGlobal.prisma.economic_board_administrator_audit_logs.findUniqueOrThrow(
      {
        where: { id: props.logId },
        ...EconomicBoardAdministratorAuditLogTransformer.select(),
      },
    );
  return await EconomicBoardAdministratorAuditLogTransformer.transform(log);
}
