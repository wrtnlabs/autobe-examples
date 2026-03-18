import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministratorRequestApplicantSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequestApplicantSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdministratorRequestApplicantSellerCollector {
  export async function collect(props: {
    body: IShoppingMallAdministratorRequestApplicantSeller.ICreate;
    administratorRequest: IEntity;
  }) {
    const id: string = v4();
    const now: Date = new Date();
    return {
      id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      administratorRequest: {
        connect: {
          id: props.administratorRequest.id,
        },
      },
      seller: {
        connect: {
          id: props.body.shopping_mall_seller_id,
        },
      },
    } satisfies Prisma.shopping_mall_administrator_request_applicant_sellersCreateInput;
  }
}
