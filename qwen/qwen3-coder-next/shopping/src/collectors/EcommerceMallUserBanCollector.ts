import { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallUserBanCollector {
  export async function collect(props: {
    body: IEcommerceMallUserBan.ICreate;
    admin: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      user_type: props.body.user_type,
      reason: props.body.reason,
      banned_at: new Date(),
      unban_at: props.body.unban_at ?? null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      user: { connect: { id: props.body.user_id } },
      admin: { connect: { id: props.admin.id } },
      registration: undefined,
    } satisfies Prisma.ecommerce_mall_user_bansCreateInput;
  }
}
