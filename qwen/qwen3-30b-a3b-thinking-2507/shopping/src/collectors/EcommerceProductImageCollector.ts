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
    return {
      id: v4(),
      image_url: props.body.image_url,
      caption: props.body.caption ?? null,
      is_primary: props.body.is_primary ?? false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      product: { connect: { id: props.ecommerceProducts.id } },
    } satisfies Prisma.ecommerce_product_imagesCreateInput;
  }
}
