import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdministratorRequestCollector {
  export async function collect(props: {
    body: IShoppingMallAdministratorRequest.ICreate;
  }) {
    return {
      id: v4(),
      actor_type: (props.body as any).actor_type ?? "unknown_actor",
      reason: (props.body as any).reason ?? "no reason provided",
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_administrator_requestsCreateInput;
  }
}
