import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallCancellationRequestSnapshotCollector } from "../collectors/ShoppingMallCancellationRequestSnapshotCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCancellationRequestSnapshotTransformer } from "../transformers/ShoppingMallCancellationRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorCancellationRequestSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallCancellationRequestSnapshot.ICreate;
}): Promise<IShoppingMallCancellationRequestSnapshot> {
  const snapshot = await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallCancellationRequestSnapshotCollector.collect(
      {
        body: props.body,
      },
    );
    const created =
      await tx.shopping_mall_cancellation_request_snapshots.create({
        data,
        ...ShoppingMallCancellationRequestSnapshotTransformer.select(),
      });
    return await ShoppingMallCancellationRequestSnapshotTransformer.transform(
      created,
    );
  });
  return snapshot;
}
