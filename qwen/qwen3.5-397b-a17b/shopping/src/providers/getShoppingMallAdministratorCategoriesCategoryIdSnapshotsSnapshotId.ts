import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCategorySnapshotTransformer } from "../transformers/ShoppingMallCategorySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorCategoriesCategoryIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCategorySnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_category_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...ShoppingMallCategorySnapshotTransformer.select(),
    });
  if (snapshot.category.id !== props.categoryId) {
    throw new HttpException(
      "Snapshot does not belong to the specified category",
      404,
    );
  }
  return await ShoppingMallCategorySnapshotTransformer.transform(snapshot);
}
