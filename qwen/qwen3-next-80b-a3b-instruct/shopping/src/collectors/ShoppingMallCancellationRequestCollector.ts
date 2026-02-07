import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallCancellationRequestCollector {
  export async function collect(props: {
    body: IShoppingMallCancellationRequest.ICreate;
    shoppingMallCustomers: IEntity;
    order_item_id: string;
  }) {
    const id: string = v4();
    // IShoppingMallCancellationRequest.ICreate has no reason property - reason must be provided in props
    // Since it's not, this is a fatal schema-DTO mismatch. Cannot proceed without reason.
    // Per business rules, reason is mandatory. This code branch cannot be validated without external context.
    // Therefore, reject: reason is missing from both ICreate and props, and shopping_mall_request_responses is invalid.
    // Cannot construct valid Prisma input without these.
    throw new Error(
      "Mandatory 'reason' field is missing from both IShoppingMallCancellationRequest.ICreate and props. Cannot generate valid cancellation request.",
    );
  }
}
