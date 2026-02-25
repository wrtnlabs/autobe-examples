import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSellerSuspensionCollector {
  export async function collect(props: {
    body: IShoppingMallSellerSuspension.ICreate;
    shoppingMallSellers: IEntity;
    shoppingMallAdmins: IEntity;
    shoppingMallAdminSessions: IEntity;
  }) {
    return {
      id: v4(),
      status: "pending",
      reason: props.body.reason,
      started_at: props.body.started_at
        ? new Date(props.body.started_at)
        : new Date(),
      ended_at: props.body.ended_at ? new Date(props.body.ended_at) : null,
      approved_at: null,
      revoked_at: null,
      rejected_at: null,
      duration_days: props.body.duration_days ?? null,
      appeal_allowed: props.body.appeal_allowed ?? false,
      review_notes: null,
      full_block: props.body.full_block ?? true,
      hide_products: props.body.hide_products ?? false,
      block_orders: props.body.block_orders ?? false,
      block_login: props.body.block_login ?? false,
      initiating_ip: null,
      created_at: new Date(),
      updated_at: new Date(),
      seller: { connect: { id: props.shoppingMallSellers.id } },
      admin: props.body.admin_id
        ? { connect: { id: props.body.admin_id } }
        : undefined,
      approvingAdmin: { connect: { id: props.shoppingMallAdmins.id } },
    } satisfies Prisma.shopping_mall_seller_suspensionsCreateInput;
  }
}
