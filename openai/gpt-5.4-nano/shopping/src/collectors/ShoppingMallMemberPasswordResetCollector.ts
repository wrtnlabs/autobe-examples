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
  }) {
    const now = new Date();
    // Derive required member relation by token lookup.
    const existingReset =
      await MyGlobal.prisma.shopping_mall_member_password_resets.findFirstOrThrow(
        {
          where: { token: props.body.token },
          select: { shopping_mall_member_id: true },
        },
      );
    return {
      id: v4(),
      token: props.body.token,
      expires_at: now,
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      member: {
        connect: { id: existingReset.shopping_mall_member_id },
      },
    } satisfies Prisma.shopping_mall_member_password_resetsCreateInput;
  }
}
