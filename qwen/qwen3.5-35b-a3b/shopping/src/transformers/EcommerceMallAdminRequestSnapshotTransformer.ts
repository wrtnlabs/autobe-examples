import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminRequestSnapshotTransformer {
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
        adminRequest: true,
        changedBy: true,
      },
    } satisfies Prisma.ecommerce_mall_admin_request_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminRequestSnapshot> {
    return {
      id: input.id,
      reason: input.reason,
      request_status: input.request_status,
      created_at: input.created_at.toISOString(),
      changed_at: input.changed_at.toISOString(),
      ecommerce_mall_admin_request_request_id: input.adminRequest.id,
      changed_by: input.changedBy?.id ?? undefined,
    };
  }
}
