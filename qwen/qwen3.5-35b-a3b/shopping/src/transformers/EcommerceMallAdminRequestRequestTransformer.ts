import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";

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
        snapshots: {},
        customerRequests: {},
        sellerRequests: {},
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
    };
  }
}
