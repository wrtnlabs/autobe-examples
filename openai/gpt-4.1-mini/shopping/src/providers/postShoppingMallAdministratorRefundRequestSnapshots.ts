import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallRefundRequestSnapshotCollector } from "../collectors/ShoppingMallRefundRequestSnapshotCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallRefundRequestSnapshotTransformer } from "../transformers/ShoppingMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdministratorRefundRequestSnapshots(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallRefundRequestSnapshot.ICreate;
}): Promise<IShoppingMallRefundRequestSnapshot> {
  const data = await ShoppingMallRefundRequestSnapshotCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.create({
      data,
    });
  const record =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findUniqueOrThrow(
      {
        where: { id: created.id },
        ...ShoppingMallRefundRequestSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallRefundRequestSnapshotTransformer.transform(record);
}
