import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallReviewSnapshotCollector } from "../collectors/ShoppingMallReviewSnapshotCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallReviewSnapshotTransformer } from "../transformers/ShoppingMallReviewSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorReviewSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallReviewSnapshot.ICreate;
}): Promise<IShoppingMallReviewSnapshot> {
  if (props.body.rating < 1 || props.body.rating > 5) {
    throw new HttpException("Rating must be between 1 and 5", 400);
  }
  const data = await ShoppingMallReviewSnapshotCollector.collect({
    body: props.body,
  });
  const created = await MyGlobal.prisma.shopping_mall_review_snapshots.create({
    data,
  });
  return await ShoppingMallReviewSnapshotTransformer.transform(created);
}
