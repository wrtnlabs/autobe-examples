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
    customer: IEntity;
    session: IEntity;
  }) {
    const now: Date = new Date();
    void props.customer;
    void props.session;
    return {
      id: v4(),
      applicant_type: "customer",
      status: "pending",
      reason: props.body.reason,
      review_note: null,
      rejection_reason: null,
      reviewed_at: null,
      approved_at: null,
      rejected_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      reviewedByAdministrator: undefined,
      customerApplicant: undefined,
      sellerApplicant: undefined,
    } satisfies Prisma.shopping_mall_administrator_requestsCreateInput;
  }
}
