import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";

export namespace ShoppingMallAdminRequestAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_admin_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        status: true,
        requested_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminRequest.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      status: input.status,
      requested_at: input.requested_at.toISOString(),
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
    };
  }
}
