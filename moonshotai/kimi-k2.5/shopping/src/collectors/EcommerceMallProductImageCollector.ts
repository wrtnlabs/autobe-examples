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
    seller: IEntity;
  }) {
    const id: string = v4();
    // Calculate next display order for this product
    const existingCount =
      await MyGlobal.prisma.ecommerce_mall_product_images.count({
        where: {
          product_id: props.product.id,
          deleted_at: null,
        },
      });
    return {
      id,
      image_url: props.body.imageUrl,
      display_order: existingCount,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.product.id } },
    } satisfies Prisma.ecommerce_mall_product_imagesCreateInput;
  }
}
