import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceOrderAtSummaryTransformer } from "./EcommerceOrderAtSummaryTransformer";

export namespace EcommerceOrderSnapshotTransformer {
  export type Payload = Prisma.ecommerce_order_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        order: EcommerceOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_order_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceOrderSnapshot> {
    return {
      id: input.id,
      order: await EcommerceOrderAtSummaryTransformer.transform(input.order),
    };
  }
}
