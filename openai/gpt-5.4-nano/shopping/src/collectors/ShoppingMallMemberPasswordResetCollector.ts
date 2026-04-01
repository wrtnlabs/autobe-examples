import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallMemberPasswordResetCollector {
  export async function collect(props: {
    body: IShoppingMallMemberPasswordReset.ICreate;
    member: IEntity;
  }) {
    const id: string = v4();
    const now = new Date();
    const toISOStringSafe = (
      PasswordUtil as unknown as {
        toISOStringSafe: (value: Date) => string;
      }
    ).toISOStringSafe;
    const nowIso = toISOStringSafe(now);
    return {
      id,
      token: props.body.token,
      expires_at: nowIso,
      used_at: null,
      created_at: nowIso,
      updated_at: nowIso,
      deleted_at: null,
      member: { connect: { id: props.member.id } },
    } satisfies Prisma.shopping_mall_member_password_resetsCreateInput;
  }
}
