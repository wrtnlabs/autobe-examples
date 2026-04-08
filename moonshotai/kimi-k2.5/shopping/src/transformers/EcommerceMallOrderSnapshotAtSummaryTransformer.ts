import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallOrderAtSummaryTransformer } from "./EcommerceMallOrderAtSummaryTransformer";

export namespace EcommerceMallOrderSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_order_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallOrderSnapshot.ISummary> {
    return {
      id: input.id,
      createdAt: input.created_at.toISOString(),
      order: await EcommerceMallOrderAtSummaryTransformer.transform(
        input.order,
      ),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        order: EcommerceMallOrderAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_order_snapshotsFindManyArgs;
  }
}
