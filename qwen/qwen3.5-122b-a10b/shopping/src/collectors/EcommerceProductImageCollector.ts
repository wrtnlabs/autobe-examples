import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceProductImageCollector {
  export async function collect(props: {
    body: IEcommerceProductImage.ICreate;
    ecommerceProducts: IEntity;
    ecommerceSellers: IEntity;
    ecommerceSellerSessions: IEntity;
  }) {
    const id: string = v4();
    // Query existing images to determine next display_order
    const existingImages =
      await MyGlobal.prisma.ecommerce_product_images.findMany({
        where: { ecommerce_product_id: props.ecommerceProducts.id },
        select: { display_order: true },
        orderBy: { display_order: "desc" },
        take: 1,
      });
    const nextDisplayOrder =
      existingImages.length > 0 ? existingImages[0].display_order + 1 : 0;
    return {
      id,
      image_url: props.body.image_url,
      display_order: nextDisplayOrder,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommerceProducts.id } },
    } satisfies Prisma.ecommerce_product_imagesCreateInput;
  }
}
