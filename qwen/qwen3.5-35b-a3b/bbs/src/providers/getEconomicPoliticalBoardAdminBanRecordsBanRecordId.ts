import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EconomicPoliticalBoardBanRecordTransformer } from "../transformers/EconomicPoliticalBoardBanRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicPoliticalBoardAdminBanRecordsBanRecordId(props: {
  admin: AdminPayload;
  banRecordId: string & tags.Format<"uuid">;
}): Promise<IEconomicPoliticalBoardBanRecord> {
  const banRecord =
    await MyGlobal.prisma.economic_political_board_ban_records.findUniqueOrThrow(
      {
        where: { id: props.banRecordId },
        ...EconomicPoliticalBoardBanRecordTransformer.select(),
      },
    );
  return await EconomicPoliticalBoardBanRecordTransformer.transform(banRecord);
}
