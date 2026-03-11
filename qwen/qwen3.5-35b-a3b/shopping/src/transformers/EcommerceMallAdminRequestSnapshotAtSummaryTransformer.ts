import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallAdminAtSummaryTransformer } from "./EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallAdminRequestRequestAtSummaryTransformer } from "./EcommerceMallAdminRequestRequestAtSummaryTransformer";

export namespace EcommerceMallAdminRequestSnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_request_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        reason: true,
        request_status: true,
        created_at: true,
        changed_at: true,
        adminRequest:
          EcommerceMallAdminRequestRequestAtSummaryTransformer.select(),
        changedBy: EcommerceMallAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_admin_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestSnapshot.ISummary> {
    return {
      id: input.id,
      reason: input.reason,
      requestStatus: typia.assert<"pending" | "approved" | "rejected">(
        input.request_status,
      ),
      createdAt: toISOStringSafe(input.created_at),
      changedAt: toISOStringSafe(input.changed_at),
      adminRequest:
        await EcommerceMallAdminRequestRequestAtSummaryTransformer.transform(
          input.adminRequest,
        ),
      changedBy: input.changedBy
        ? await EcommerceMallAdminAtSummaryTransformer.transform(
            input.changedBy,
          )
        : undefined,
    };
  }
}
