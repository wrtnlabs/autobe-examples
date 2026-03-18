import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
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
        member: true,
      },
    } satisfies Prisma.shopping_mall_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload & {
      password: boolean;
    },
  ): Promise<IShoppingMallMemberPasswordReset> {
    return {
      token: input.token,
      password: input.password,
    };
  }
}
