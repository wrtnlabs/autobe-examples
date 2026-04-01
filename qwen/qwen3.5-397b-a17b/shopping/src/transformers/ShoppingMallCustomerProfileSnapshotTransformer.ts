import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallCustomerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallCustomerProfileAtSummaryTransformer } from "./ShoppingMallCustomerProfileAtSummaryTransformer";

export namespace ShoppingMallCustomerProfileSnapshotTransformer {
  export type Payload =
    Prisma.shopping_mall_customer_profile_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        customer: ShoppingMallCustomerAtSummaryTransformer.select(),
        customerProfile:
          ShoppingMallCustomerProfileAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_customer_profile_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomerProfileSnapshot> {
    return {
      id: input.id,
      customer: await ShoppingMallCustomerAtSummaryTransformer.transform(
        input.customer,
      ),
      customerProfile:
        await ShoppingMallCustomerProfileAtSummaryTransformer.transform(
          input.customerProfile,
        ),
      displayName: input.display_name,
      phoneNumber: input.phone_number ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
