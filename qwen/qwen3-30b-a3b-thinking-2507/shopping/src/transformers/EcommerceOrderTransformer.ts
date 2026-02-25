import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAddressAtSummaryTransformer } from "./EcommerceCustomerAddressAtSummaryTransformer";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";

export namespace EcommerceOrderTransformer {
  export type Payload = Prisma.ecommerce_ordersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        status: true,
        total_amount: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        shippingAddress: EcommerceCustomerAddressAtSummaryTransformer.select(),
        orderItems: {
          select: {},
          shipments: {
            select: {},
            snapshots: {
              select: {},
            },
          },
        },
      },
    };
  }
  export async function transform(input: Payload): Promise<IEcommerceOrder> {
    return {
      id: input.id,
      status: input.status,
      total_amount: Number(input.total_amount),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      shippingAddress:
        await EcommerceCustomerAddressAtSummaryTransformer.transform(
          input.shippingAddress,
        ),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
