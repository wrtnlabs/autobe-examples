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
    ecommerceMallProducts: IEntity;
  }) {
    const id: string = v4();
    // Query existing images to determine next display_order
    const existingImages =
      await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
        where: {
          product_id: props.ecommerceMallProducts.id,
          deleted_at: null,
        },
        select: {
          display_order: true,
        },
      });
    const displayOrder =
      existingImages.length > 0
        ? Math.max(...existingImages.map((img) => img.display_order)) + 1
        : 0;
    return {
      id,
      image_url: props.body.imageUrl,
      display_order: displayOrder,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommerceMallProducts.id } },
    } satisfies Prisma.ecommerce_mall_product_imagesCreateInput;
  }
}
