import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace MallPlatformCustomerTransformer {
  export type Payload = Prisma.mall_platform_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: { select: {} },
        passwordResets: { select: {} },
        profile: { select: {} },
        shippingAddresses: { select: {} },
        shoppingCart: { select: {} },
        wishlist: { select: {} },
        orders: { select: {} },
        refundRequests: { select: {} },
        reviews: { select: {} },
        reviewSnapshots: { select: {} },
      },
    } satisfies Prisma.mall_platform_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IMallPlatformCustomer> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
