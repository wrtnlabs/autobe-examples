import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAddressTransformer {
  export type Payload = Prisma.ecommerce_mall_addressesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        customer: {
          select: { id: true },
        },
        recipient_name: true,
        recipient_phone: true,
        street: true,
        city: true,
        state: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orders: true,
        snapshots: true,
      },
    } satisfies Prisma.ecommerce_mall_addressesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAddress> {
    return {
      id: input.id,
      ecommerce_mall_customer_id: input.customer.id,
      recipient_name: input.recipient_name,
      recipient_phone: input.recipient_phone,
      street: input.street,
      city: input.city,
      state: input.state,
      is_default: input.is_default,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IEcommerceMallAddress;
  }
}
