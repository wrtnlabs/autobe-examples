import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAddressCollector {
  export async function collect(props: {
    body: IShoppingMallAddress.ICreate;
    shoppingMallMembers: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    return {
      id,
      recipient_name: props.body.recipient_name,
      phone_number: props.body.phone_number,
      postal_code: props.body.postal_code,
      country: props.body.country,
      city: props.body.city,
      street_line1: props.body.street_line1,
      street_line2: props.body.street_line2 ?? null,
      is_default: props.body.is_default ?? false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallMembers.id } },
      // addressSnapshots is a reverse relation; do not set it here.
    } satisfies Prisma.shopping_mall_addressesCreateInput;
  }
}
