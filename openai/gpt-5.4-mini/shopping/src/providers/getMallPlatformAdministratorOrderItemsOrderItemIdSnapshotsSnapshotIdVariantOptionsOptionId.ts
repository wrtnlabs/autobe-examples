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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformOrderItemSnapshotVariantOptionTransformer } from "../transformers/MallPlatformOrderItemSnapshotVariantOptionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorOrderItemsOrderItemIdSnapshotsSnapshotIdVariantOptionsOptionId(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformOrderItemSnapshotVariantOption> {
  const option =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.findFirstOrThrow(
      {
        where: {
          id: props.optionId,
          deleted_at: null,
          orderItemSnapshot: {
            id: props.snapshotId,
            deleted_at: null,
            orderItem: {
              id: props.orderItemId,
              deleted_at: null,
            },
          },
        },
        ...MallPlatformOrderItemSnapshotVariantOptionTransformer.select(),
      },
    );
  return await MallPlatformOrderItemSnapshotVariantOptionTransformer.transform(
    option,
  );
}
