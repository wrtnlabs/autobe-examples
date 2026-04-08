import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MallPlatformOrderItemSnapshotVariantOptionCollector } from "../collectors/MallPlatformOrderItemSnapshotVariantOptionCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformOrderItemSnapshotVariantOptionTransformer } from "../transformers/MallPlatformOrderItemSnapshotVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformSellerOrderItemSnapshotsOrderItemSnapshotIdVariantOptions(props: {
  seller: SellerPayload;
  orderItemSnapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshotVariantOption.ICreate;
}): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
  await MyGlobal.prisma.mall_platform_order_item_snapshots.findUniqueOrThrow({
    where: {
      id: props.orderItemSnapshotId,
    },
    select: {
      id: true,
    },
  });
  try {
    const record =
      await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.create(
        {
          data: await MallPlatformOrderItemSnapshotVariantOptionCollector.collect(
            {
              body: props.body,
              orderItemSnapshot: {
                id: props.orderItemSnapshotId,
              },
            },
          ),
          ...MallPlatformOrderItemSnapshotVariantOptionTransformer.select(),
        },
      );
    return await MallPlatformOrderItemSnapshotVariantOptionTransformer.transform(
      record,
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate option name within the same order item snapshot",
        409,
      );
    }
    throw error;
  }
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
// import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
// import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformSellerOrderItemSnapshotsOrderItemSnapshotIdVariantOptions(props: {
//   seller: SellerPayload;
//   orderItemSnapshotId: string & tags.Format<"uuid">;
//   body: IMallPlatformOrderItemSnapshotVariantOption.ICreate;
// }): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
//   const record = await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.create({
//     data: await MallPlatformOrderItemSnapshotVariantOptionCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...MallPlatformOrderItemSnapshotVariantOptionTransformer.select(),
//   });
//   return await MallPlatformOrderItemSnapshotVariantOptionTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------