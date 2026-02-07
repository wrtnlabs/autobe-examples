import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerEmailVerificationCollector {
  export async function collect(props: {
    body: IShoppingMallSellerEmailVerification.ICreate;
    seller: IEntity;
  }) {
    const id: string = v4();
    const token: string = v4();
    const now: Date = new Date();
    return {
      id,
      token,
      expired_at: new Date(now.getTime() + 60 * 60 * 1000), // 1 hour from now
      verified_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.shopping_mall_seller_email_verificationsCreateInput;
  }
}
