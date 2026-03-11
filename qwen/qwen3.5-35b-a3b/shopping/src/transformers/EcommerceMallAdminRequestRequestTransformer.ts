import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallAdminRequestRequestOfCustomerTransformer } from "./EcommerceMallAdminRequestRequestOfCustomerTransformer";
import { EcommerceMallAdminRequestRequestOfSellerTransformer } from "./EcommerceMallAdminRequestRequestOfSellerTransformer";
import { EcommerceMallAdminRequestSnapshotTransformer } from "./EcommerceMallAdminRequestSnapshotTransformer";

export namespace EcommerceMallAdminRequestRequestTransformer {
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
        snapshots: EcommerceMallAdminRequestSnapshotTransformer.select(),
        customerRequests:
          EcommerceMallAdminRequestRequestOfCustomerTransformer.select(),
        sellerRequests:
          EcommerceMallAdminRequestRequestOfSellerTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_request_requestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestRequest> {
    return {
      id: input.id,
      reason: input.reason,
      request_status: typia.assert<"pending" | "approved" | "rejected">(
        input.request_status,
      ),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      admin: await EcommerceMallAdminAtSummaryTransformer.transform(
        input.admin,
      ),
      snapshots: await ArrayUtil.asyncMap(
        input.snapshots,
        EcommerceMallAdminRequestSnapshotTransformer.transform,
      ),
      customerRequests: input.customerRequests
        ? await EcommerceMallAdminRequestRequestOfCustomerTransformer.transform(
            input.customerRequests,
          )
        : null,
      sellerRequests: input.sellerRequests
        ? await EcommerceMallAdminRequestRequestOfSellerTransformer.transform(
            input.sellerRequests,
          )
        : null,
    };
  }
}
