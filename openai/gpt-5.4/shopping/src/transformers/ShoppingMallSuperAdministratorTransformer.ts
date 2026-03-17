import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSuperAdministratorTransformer {
  export type Payload = Prisma.shopping_mall_super_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_super_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSuperAdministrator> {
    return {
      id: input.id,
      email: input.email,
      active: input.active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
