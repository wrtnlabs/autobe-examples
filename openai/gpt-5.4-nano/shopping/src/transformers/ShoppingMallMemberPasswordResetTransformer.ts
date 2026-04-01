import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallMemberPasswordResetTransformer {
  export type Payload = Prisma.shopping_mall_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMemberPasswordReset> {
    return {
      token: input.token,
      // DB-backed boolean indicating whether the token is eligible (unused and not soft-deleted)
      password: input.used_at === null && input.deleted_at === null,
    };
  }
}
