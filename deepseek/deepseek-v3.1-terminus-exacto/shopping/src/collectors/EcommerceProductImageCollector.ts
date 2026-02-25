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
  }) {
    const id: string = v4();
    return {
      id,
      image_url: props.body.image_url,
      position: props.body.position,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.ecommerceProducts.id } },
    } satisfies Prisma.ecommerce_product_imagesCreateInput;
  }
}
