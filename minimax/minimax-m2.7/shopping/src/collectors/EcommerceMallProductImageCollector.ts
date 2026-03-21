import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductImageCollector {
  export async function collect(props: {
    body: IEcommerceMallProductImage.ICreate;
    product: IEntity;
    sequence: number;
  }) {
    const id: string = v4();
    return {
      id,
      image_url: props.body.imageUrls[props.sequence],
      display_order: props.sequence,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.product.id } },
    } satisfies Prisma.ecommerce_mall_product_imagesCreateInput;
  }
}
