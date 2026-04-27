import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallOrderItemSellerSnapshotTransformer } from "../transformers/ECommerceMallOrderItemSellerSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getECommerceMallSellerOrderItemsItemIdSellerSnapshot(props: {
  seller: SellerPayload;
  itemId: string & tags.Format<"uuid">;
}): Promise<IECommerceMallOrderItemSellerSnapshot> {
  const record =
    await MyGlobal.prisma.e_commerce_mall_order_item_seller_snapshots.findFirstOrThrow(
      {
        where: {
          e_commerce_mall_order_item_id: props.itemId,
          orderItem: {
            productVariant: {
              product: {
                seller_id: props.seller.id,
              },
            },
          },
        },
        ...ECommerceMallOrderItemSellerSnapshotTransformer.select(),
      },
    );
  return await ECommerceMallOrderItemSellerSnapshotTransformer.transform(
    record,
  );
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getECommerceMallSellerOrderItemsItemIdSellerSnapshot(props: {
//   seller: SellerPayload;
//   itemId: string & tags.Format<"uuid">;
// }): Promise<IECommerceMallOrderItemSellerSnapshot> {
//   const record = await MyGlobal.prisma.e_commerce_mall_order_item_seller_snapshots.findFirstOrThrow({
//     ...ECommerceMallOrderItemSellerSnapshotTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallOrderItemSellerSnapshotTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------