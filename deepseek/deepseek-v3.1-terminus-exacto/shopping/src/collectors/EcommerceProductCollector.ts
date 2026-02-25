import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceProductCollector {
  export async function collect(props: {
    body: IEcommerceProduct.ICreate;
    ecommerceSellers: IEntity;
    ecommerceSellerSessions: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      name: props.body.name,
      description: props.body.description,
      base_price: props.body.base_price,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      seller: { connect: { id: props.ecommerceSellers.id } },
      category: { connect: { id: props.body.category_id } },
      // HasMany relations - not applicable for creation
      metadataRegistryRelationships: undefined,
      images: undefined,
      variants: undefined,
      snapshots: undefined,
      cartItems: undefined,
      orderItemPurchaseSnapshots: undefined,
      reviews: undefined,
      administrativeActions: undefined,
    } satisfies Prisma.ecommerce_productsCreateInput;
  }
}
