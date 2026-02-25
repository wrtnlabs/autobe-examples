import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceCustomerAtSummaryTransformer } from "./EcommerceCustomerAtSummaryTransformer";

export namespace EcommerceCustomerProfileTransformer {
  export type Payload = Prisma.ecommerce_customer_profilesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        phone_number: true,
        customer: EcommerceCustomerAtSummaryTransformer.select(),
        snapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_customer_profile_snapshotsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_customer_profilesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceCustomerProfile> {
    return {
      id: input.id,
      display_name: input.display_name,
      phone_number: input.phone_number,
      customer: await EcommerceCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}
