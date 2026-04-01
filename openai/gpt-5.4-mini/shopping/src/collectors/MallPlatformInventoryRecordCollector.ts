import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformInventoryRecordCollector {
  export async function collect(props: {
    body: IMallPlatformInventoryRecord.ICreate;
    productVariant: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      quantity_change: props.body.quantityChange,
      reason: props.body.reason,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      productVariant: { connect: { id: props.productVariant.id } },
    } satisfies Prisma.mall_platform_inventory_recordsCreateInput;
  }
}
