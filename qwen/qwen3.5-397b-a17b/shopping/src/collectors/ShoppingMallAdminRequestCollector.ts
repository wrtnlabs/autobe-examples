import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdminRequestCollector {
  export async function collect(props: {
    body: IShoppingMallAdminRequest.ICreate;
    shoppingMallCustomers: IEntity;
  }) {
    const id: string = v4();
    return {
      // Scalar fields
      id,
      reason: props.body.reason,
      status: "PENDING",
      requested_at: new Date(),
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      respondedBySuperAdmin: undefined,
      // HasMany relations (not needed)
    } satisfies Prisma.shopping_mall_admin_requestsCreateInput;
  }
}
