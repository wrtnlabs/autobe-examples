import { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallProductDeletionCollector {
  export async function collect(props: {
    body: IEcommerceMallProductDeletion.ICreate;
    ecommerceMallProducts: IEntity;
    ecommerceMallAdmins: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      reason: props.body.reason,
      status: "pending",
      responded_at: null,
      approval_notes: null,
      deleted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      product: { connect: { id: props.ecommerceMallProducts.id } },
      admin: { connect: { id: props.ecommerceMallAdmins.id } },
      parentRequest: undefined,
    } satisfies Prisma.ecommerce_mall_product_deletionsCreateInput;
  }
}
