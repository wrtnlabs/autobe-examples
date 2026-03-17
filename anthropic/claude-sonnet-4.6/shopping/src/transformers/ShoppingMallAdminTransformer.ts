import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminOfCustomerTransformer } from "./ShoppingMallAdminOfCustomerTransformer";
import { ShoppingMallAdminOfSellerTransformer } from "./ShoppingMallAdminOfSellerTransformer";

export namespace ShoppingMallAdminTransformer {
  export type Payload = Prisma.shopping_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        actor_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        adminOfCustomer: ShoppingMallAdminOfCustomerTransformer.select(),
        adminOfSeller: ShoppingMallAdminOfSellerTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallAdmin> {
    const origin: IShoppingMallAdminOfCustomer | IShoppingMallAdminOfSeller =
      input.actor_type === "customer"
        ? await ShoppingMallAdminOfCustomerTransformer.transform(
            input.adminOfCustomer!,
          )
        : await ShoppingMallAdminOfSellerTransformer.transform(
            input.adminOfSeller!,
          );
    return {
      id: input.id,
      email: input.email,
      actor_type: input.actor_type as "customer" | "seller",
      grade: "regular",
      origin,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
