import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleUnitSnapshotTransformer } from "../transformers/ShoppingMallSaleUnitSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSalesSaleIdUnitsUnitIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  unitId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleUnitSnapshot> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { seller_id: true },
  });
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_sale_unit_id: props.unitId,
      },
      ...ShoppingMallSaleUnitSnapshotTransformer.select(),
    });
  return await ShoppingMallSaleUnitSnapshotTransformer.transform(snapshot);
}
