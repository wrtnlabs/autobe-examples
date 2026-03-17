import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import { IShoppingMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequestSnapshot";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallAdminRequestAtSummaryTransformer } from "./ShoppingMallAdminRequestAtSummaryTransformer";
import { ShoppingMallCustomerAtSummaryTransformer } from "./ShoppingMallCustomerAtSummaryTransformer";
import { ShoppingMallSuperAdminAtSummaryTransformer } from "./ShoppingMallSuperAdminAtSummaryTransformer";

export namespace ShoppingMallAdminRequestSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_admin_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        user_id: true,
        reason: true,
        status: true,
        requested_at: true,
        responded_at: true,
        created_at: true,
        adminRequest: ShoppingMallAdminRequestAtSummaryTransformer.select(),
        respondedBySuperAdmin:
          ShoppingMallSuperAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_admin_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdminRequestSnapshot> {
    return {
      id: input.id,
      adminRequest:
        await ShoppingMallAdminRequestAtSummaryTransformer.transform(
          input.adminRequest,
        ),
      user: await ShoppingMallCustomerAtSummaryTransformer.transform({
        id: input.user_id,
      } as any),
      reason: input.reason,
      status: input.status,
      requested_at: input.requested_at.toISOString(),
      responded_at: input.responded_at?.toISOString() ?? null,
      respondedBySuperAdmin: input.respondedBySuperAdmin
        ? await ShoppingMallSuperAdminAtSummaryTransformer.transform(
            input.respondedBySuperAdmin,
          )
        : null,
      created_at: input.created_at.toISOString(),
    };
  }
}
