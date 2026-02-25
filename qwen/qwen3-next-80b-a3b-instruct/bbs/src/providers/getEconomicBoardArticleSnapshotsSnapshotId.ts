import { IEconomicBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardArticleSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicBoardArticleSnapshotTransformer } from "../transformers/EconomicBoardArticleSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardArticleSnapshotsSnapshotId(props: {
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardArticleSnapshot> {
  const snapshot =
    await MyGlobal.prisma.economic_board_article_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EconomicBoardArticleSnapshotTransformer.select(),
    });
  return await EconomicBoardArticleSnapshotTransformer.transform(snapshot);
}
