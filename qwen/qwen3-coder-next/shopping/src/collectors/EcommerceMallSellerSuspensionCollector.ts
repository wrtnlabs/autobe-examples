import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallSellerSuspensionCollector {
  export async function collect(props: {
    body: IEcommerceMallSellerSuspension.ICreate;
    ecommerceMallAdmins: IEntity;
    ecommerceMallSellers: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason ?? null,
      reinstated_at: null,
      reinstated_by_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      admin: { connect: { id: props.ecommerceMallAdmins.id } },
    } satisfies Prisma.ecommerce_mall_seller_suspensionsCreateInput;
  }
}
