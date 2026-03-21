import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCustomerAtSummaryTransformer } from "./EcommerceMallCustomerAtSummaryTransformer";

export namespace EcommerceMallCustomerProfileTransformer {
  export type Payload = Prisma.ecommerce_mall_customer_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        phone: true,
        created_at: true,
        updated_at: true,
        customer: EcommerceMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customer_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      phone: input.phone,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      customer: await EcommerceMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}
