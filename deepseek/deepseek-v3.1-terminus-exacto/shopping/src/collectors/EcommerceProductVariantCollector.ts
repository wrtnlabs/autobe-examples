import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceProductVariantCollector {
  export async function collect(props: {
    body: IEcommerceProductVariant.ICreate;
    product: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      sku: props.body.sku,
      option_values: props.body.option_values,
      price_override: props.body.price_override ?? null,
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      product: { connect: { id: props.product.id } },
      // HasMany relations (not needed for creation)
      metadataRegistryRelationshipVariants: undefined,
      inventoryRecords: undefined,
      snapshots: undefined,
      cartItems: undefined,
      orderItems: undefined,
      orderItemPurchaseSnapshots: undefined,
    } satisfies Prisma.ecommerce_product_variantsCreateInput;
  }
}
