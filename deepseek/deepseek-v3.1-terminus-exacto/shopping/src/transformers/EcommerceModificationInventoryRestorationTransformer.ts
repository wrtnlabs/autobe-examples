import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceInventoryRecord";
import { IEcommerceModificationInventoryRestoration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceModificationInventoryRestoration";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCancellationRequestTransformer } from "./EcommerceCancellationRequestTransformer";
import { EcommerceInventoryRecordTransformer } from "./EcommerceInventoryRecordTransformer";
import { EcommerceRefundRequestTransformer } from "./EcommerceRefundRequestTransformer";

export namespace EcommerceModificationInventoryRestorationTransformer {
  export type Payload =
    Prisma.ecommerce_modification_inventory_restorationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_restored: true,
        restoration_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        cancellationRequest: EcommerceCancellationRequestTransformer.select(),
        refundRequest: EcommerceRefundRequestTransformer.select(),
        inventoryRecord: EcommerceInventoryRecordTransformer.select(),
      },
    } satisfies Prisma.ecommerce_modification_inventory_restorationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceModificationInventoryRestoration> {
    return {
      id: input.id,
      quantity_restored: input.quantity_restored,
      restoration_reason: input.restoration_reason,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
      cancellationRequest: input.cancellationRequest
        ? await EcommerceCancellationRequestTransformer.transform(
            input.cancellationRequest,
          )
        : null,
      refundRequest: input.refundRequest
        ? await EcommerceRefundRequestTransformer.transform(input.refundRequest)
        : null,
      inventoryRecord: await EcommerceInventoryRecordTransformer.transform(
        input.inventoryRecord,
      ),
    };
  }
}
