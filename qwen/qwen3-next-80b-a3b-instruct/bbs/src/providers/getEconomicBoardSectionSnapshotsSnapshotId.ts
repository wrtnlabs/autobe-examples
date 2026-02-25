import { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEconomicBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardSectionSnapshotTransformer } from "../transformers/EconomicBoardSectionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardSectionSnapshotsSnapshotId(props: {
  snapshotId: string;
}): Promise<IEconomicBoardSectionSnapshot> {
  const snapshot =
    await MyGlobal.prisma.economic_board_section_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EconomicBoardSectionSnapshotTransformer.select(),
    });
  return await EconomicBoardSectionSnapshotTransformer.transform(snapshot);
}
