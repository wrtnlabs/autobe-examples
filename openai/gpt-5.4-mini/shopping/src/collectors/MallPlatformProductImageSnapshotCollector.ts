import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductImageSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImageSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformProductImageSnapshotCollector {
  export async function collect(props: {
    body: IMallPlatformProductImageSnapshot.ICreate;
    product: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    const image_url = "";
    const image_order = 0;
    const is_main = false;
    return {
      id,
      image_url,
      image_order,
      is_main,
      changed_at: now,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      product: {
        connect: {
          id: props.product.id,
        },
      },
    } satisfies Prisma.mall_platform_product_image_snapshotsCreateInput;
  }
}
