import { IEcommerceMallAdminActionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminActionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminActionLogAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_action_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_id: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_adminsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_admin_action_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdminActionLog.ISummary> {
    return {
      id: input.id,
      action_type: input.action_type,
      target_id: input.target_id,
      description: input.description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      ecommerce_mall_admin_id: input.admin.id,
    };
  }
}
