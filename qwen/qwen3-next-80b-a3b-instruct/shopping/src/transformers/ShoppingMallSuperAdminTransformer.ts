import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSuperAdminTransformer {
  export type Payload = Prisma.shopping_mall_super_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        role: true,
      },
    } satisfies Prisma.shopping_mall_super_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSuperAdmin> {
    return {
      id: input.id,
      email: input.email,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      adminType: input.role as "regular" | "super",
      name: undefined,
      phone_number: undefined,
      avatar_url: undefined,
    };
  }
}
