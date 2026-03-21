import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEcommerceMallSuperAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLog";
import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallSuperAdminAtSummaryTransformer } from "./EcommerceMallSuperAdminAtSummaryTransformer";
import { EcommerceMallSuperAdminAuditLogMetadatumTransformer } from "./EcommerceMallSuperAdminAuditLogMetadatumTransformer";

export namespace EcommerceMallSuperAdminAuditLogAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_super_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action: true,
        target_type: true,
        target_id: true,
        ip: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        superAdmin: EcommerceMallSuperAdminAtSummaryTransformer.select(),
        metadataEntries:
          EcommerceMallSuperAdminAuditLogMetadatumTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLog.IInvert> {
    return {
      id: input.id,
      action: input.action,
      target_type: input.target_type ?? undefined,
      target_id: input.target_id ?? undefined,
      ip: input.ip,
      user_agent: input.user_agent,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      superAdmin: await EcommerceMallSuperAdminAtSummaryTransformer.transform(
        input.superAdmin,
      ),
      metadataEntries: await ArrayUtil.asyncMap(
        input.metadataEntries,
        EcommerceMallSuperAdminAuditLogMetadatumTransformer.transform,
      ),
    };
  }
}
