import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformProductCollector {
  export async function collect(props: {
    body: IMallPlatformProduct.ICreate;
    sellerAccount: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.basePrice,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      sellerAccount: {
        connect: { id: props.sellerAccount.id },
      },
      category: props.body.categoryId
        ? { connect: { id: props.body.categoryId } }
        : undefined,
      images: undefined,
      variants: undefined,
      productImageSnapshots: undefined,
      variantSnapshots: undefined,
      wishlistItems: undefined,
      reviews: undefined,
      snapshots: undefined,
    } satisfies Prisma.mall_platform_productsCreateInput;
  }
}
