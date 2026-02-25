import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceDeliveryConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDeliveryConfirmation";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerTransformer } from "./EcommerceCustomerTransformer";
import { EcommerceShipmentTransformer } from "./EcommerceShipmentTransformer";

export namespace EcommerceDeliveryConfirmationTransformer {
  export type Payload = Prisma.ecommerce_delivery_confirmationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        confirmed_at: true,
        created_at: true,
        updated_at: true,
        shipment: EcommerceShipmentTransformer.select(),
        customer: EcommerceCustomerTransformer.select(),
      },
    } satisfies Prisma.ecommerce_delivery_confirmationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceDeliveryConfirmation> {
    return {
      id: input.id,
      confirmed_at: input.confirmed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      shipment: await EcommerceShipmentTransformer.transform(input.shipment),
      customer: await EcommerceCustomerTransformer.transform(input.customer),
    };
  }
}
