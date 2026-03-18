import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { IShoppingMallSnapshotParty } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotParty";
import { IShoppingMallSnapshotPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshotPayload";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSnapshotCollector } from "../collectors/ShoppingMallSnapshotCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallSnapshotTransformer } from "../transformers/ShoppingMallSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallSnapshot.ICreate;
}): Promise<IShoppingMallSnapshot> {
  const prismaTx = MyGlobal.prisma.$transaction;
  const snapshot = await prismaTx(async (tx) => {
    try {
      const created = await tx.shopping_mall_snapshots.create({
        data: await ShoppingMallSnapshotCollector.collect({
          body: props.body,
        }),
        ...ShoppingMallSnapshotTransformer.select(),
      });
      return created;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new HttpException("snapshot_code already exists", 409);
      }
      throw err;
    }
  });
  return await ShoppingMallSnapshotTransformer.transform(snapshot);
}
