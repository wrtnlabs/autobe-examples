import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformInventoryRecordTransformer } from "../transformers/MallPlatformInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMallPlatformAdministratorProductVariantsProductVariantIdInventoryRecordsInventoryRecordId(props: {
  administrator: AdministratorPayload;
  productVariantId: string & tags.Format<"uuid">;
  inventoryRecordId: string & tags.Format<"uuid">;
}): Promise<IMallPlatformInventoryRecord> {
  await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
    where: {
      id: props.productVariantId,
    },
    select: {
      id: true,
    },
  });
  return await MallPlatformInventoryRecordTransformer.transform(
    await MyGlobal.prisma.mall_platform_inventory_records.findFirstOrThrow({
      where: {
        id: props.inventoryRecordId,
        mall_platform_product_variant_id: props.productVariantId,
      },
      ...MallPlatformInventoryRecordTransformer.select(),
    }),
  );
}
