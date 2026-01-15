import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallAdminCollector {
  export async function collect(props: { body: IShoppingMallAdmin.ICreate }) {
    return {
      id: v4(),
      email: props.body.email,
      password_hash: props.body.password
        ? await PasswordUtil.hash(props.body.password)
        : "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      shopping_mall_admin_sessions: undefined,
      shopping_mall_payment_audit_logs: undefined,
      shopping_mall_payment_disputes: undefined,
      shopping_mall_review_votes: undefined,
      shopping_mall_review_moderation_logs: undefined,
    } satisfies Prisma.shopping_mall_adminsCreateInput;
  }
}
