import { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategorySnapshotTransformer } from "../transformers/EcommerceMallCategorySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCategorySnapshotsSnapshotId(props: {
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallCategorySnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_category_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...EcommerceMallCategorySnapshotTransformer.select(),
    });
  return await EcommerceMallCategorySnapshotTransformer.transform(snapshot);
}
