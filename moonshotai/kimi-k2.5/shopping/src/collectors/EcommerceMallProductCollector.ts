import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EcommerceMallProductImageCollector } from "./EcommerceMallProductImageCollector";

export namespace EcommerceMallProductCollector {
  export async function collect(props: {
    body: IEcommerceMallProduct.ICreate;
    seller: IEntity;
  }) {
    const id = v4();
    return {
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.basePrice,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
      category: { connect: { id: props.body.categoryId } },
      images: props.body.images?.length
        ? {
            create: await ArrayUtil.asyncMap(props.body.images, (image, i) => {
              const body = {
                ...image,
                sequence: i,
              } as IEcommerceMallProductImage.ICreate;
              return EcommerceMallProductImageCollector.collect({
                body,
                ecommerceMallProducts: { id },
              });
            }),
          }
        : undefined,
    } satisfies Prisma.ecommerce_mall_productsCreateInput;
  }
}
