import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallAdminRequestCollector {
  export async function collect(props: {
    body: IEcommerceMallAdminRequest.ICreate;
    ecommerceMallCustomers?: IEntity;
    ecommerceMallSellers?: IEntity;
    ecommerceMallCustomerSessions?: IEntity;
    ecommerceMallSellerSessions?: IEntity;
  }) {
    const id: string = v4();
    // Determine actor type based on which entity is provided
    const isCustomer = !!props.ecommerceMallCustomers;
    const isSeller = !!props.ecommerceMallSellers;
    return {
      // Scalar fields
      id,
      actor_type: isCustomer ? "customer" : "seller",
      requested_grade: props.body.requested_grade ?? "admin",
      reason: props.body.reason,
      status: "pending",
      reviewed_reason: undefined,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Belonged relations (not applicable for create)
      reviewer: undefined,
      // HasOne relations (polymorphic - only one will be set)
      customer: props.ecommerceMallCustomers
        ? { connect: { id: props.ecommerceMallCustomers.id } }
        : undefined,
      adminRequestOfSeller: props.ecommerceMallSellers
        ? { connect: { id: props.ecommerceMallSellers.id } }
        : undefined,
    } satisfies Prisma.ecommerce_mall_admin_requestsCreateInput;
  }
}
