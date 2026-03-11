import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallSellerAtSummaryTransformer } from "./EcommerceMallSellerAtSummaryTransformer";

export namespace EcommerceMallAdminRequestRequestOfSellerTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_request_requestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        request_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
        snapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_admin_request_snapshotsFindManyArgs,
        sellerRequests: {
          select: {
            seller: EcommerceMallSellerAtSummaryTransformer.select(),
          },
        },
      },
    } satisfies Prisma.ecommerce_mall_admin_request_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestRequestOfSeller> {
    return {
      id: input.id,
      reason: input.reason,
      request_status: input.request_status,
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      seller:
        input.sellerRequests?.seller !== null && input.sellerRequests !== null
          ? await EcommerceMallSellerAtSummaryTransformer.transform(
              input.sellerRequests.seller,
            )
          : (undefined as any),
      sellerProfile: undefined as any,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    } satisfies IEcommerceMallAdminRequestRequestOfSeller;
  }
}
