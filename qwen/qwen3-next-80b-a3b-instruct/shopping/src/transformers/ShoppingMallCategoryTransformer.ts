import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCategoryTransformer {
  export type Payload = Prisma.shopping_mall_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        is_active: true,
        user_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        productSnapshots: true,
        productVariantSnapshotsChangeds: true,
        cancellationResponses: true,
      },
    } satisfies Prisma.shopping_mall_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCategory> {
    let status: IShoppingMallCategory["status"] = undefined;
    // If account is deleted, status should be undefined (not null)
    if (input.deleted_at) {
      status = undefined;
    }
    // If user is seller, map status to restricted enum values
    else if (input.user_type === "seller") {
      switch (input.status) {
        case "pending":
        case "approved":
        case "rejected":
        case "suspended":
          status = input.status;
          break;
        default:
          status = undefined;
      }
    }
    // For customers and admins, status is undefined (not applicable)
    return {
      id: input.id,
      display_name: undefined,
      shop_name: undefined,
      status,
      email: input.email,
      phone_number: undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: input.updated_at
        ? toISOStringSafe(input.updated_at)
        : undefined,
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    } satisfies IShoppingMallCategory;
  }
}
