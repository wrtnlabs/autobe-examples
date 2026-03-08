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
import { EconomicPoliticalBoardBanRecordAtSummaryTransformer } from "../transformers/EconomicPoliticalBoardBanRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardAdminBanRecordsBanRecordIdUnban(props: {
  admin: AdminPayload;
  banRecordId: number & tags.Type<"int32">;
}): Promise<IEconomicPoliticalBoardBanRecord.ISummary> {
  // Convert banRecordId number to UUID string format
  const banRecordIdUUID = props.banRecordId.toString() as string &
    tags.Format<"uuid">;
  // Step 1: Retrieve full ban record with relations for response
  const banRecordWithRelations =
    await MyGlobal.prisma.economic_political_board_ban_records.findUniqueOrThrow(
      {
        where: { id: banRecordIdUUID },
        ...EconomicPoliticalBoardBanRecordAtSummaryTransformer.select(),
      },
    );
  // Step 2: Transform and return response
  return await EconomicPoliticalBoardBanRecordAtSummaryTransformer.transform(
    banRecordWithRelations,
  );
}
