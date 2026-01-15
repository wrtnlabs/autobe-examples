import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallUserFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserFlag";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallUserFlagCollector {
  export async function collect(props: {
    body: IShoppingMallUserFlag.ICreate;
    flagger: IEntity;
    flaggedCustomer: IEntity;
    flaggedSeller: IEntity;
  }) {
    return {
      id: v4(),
      actor_type: "customer",
      flag_type: props.body.flag_key,
      description: props.body.description ?? "",
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      flagger: {
        connect: { id: props.flagger.id },
      },
      flaggedCustomer: {
        connect: { id: props.flaggedCustomer.id },
      },
      flaggedSeller: undefined,
    } satisfies Prisma.shopping_mall_user_flagsCreateInput;
  }
}
