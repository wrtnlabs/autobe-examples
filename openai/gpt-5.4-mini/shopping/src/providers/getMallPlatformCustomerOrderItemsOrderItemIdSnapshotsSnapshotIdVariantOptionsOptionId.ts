import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformOrderItemSnapshotVariantOptionTransformer } from "../transformers/MallPlatformOrderItemSnapshotVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformCustomerOrderItemsOrderItemIdSnapshotsSnapshotIdVariantOptionsOptionId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
  const option =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.findFirstOrThrow(
      {
        where: {
          id: props.optionId,
          orderItemSnapshot: {
            id: props.snapshotId,
            mall_platform_order_item_id: props.orderItemId,
            orderItem: {
              mall_platform_order_id: props.customer.id,
            },
          },
        },
        include: {
          orderItemSnapshot: {
            include: {
              orderItem: true,
              variantOptions: true,
            },
          },
        },
      },
    );
  return await MallPlatformOrderItemSnapshotVariantOptionTransformer.transform(
    option,
  );
}
