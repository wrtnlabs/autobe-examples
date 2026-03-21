import { IEcommerceMallSuperAdminAuditLogMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminAuditLogMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSuperAdminAuditLogMetadatumTransformer {
  export type Payload =
    Prisma.ecommerce_mall_super_admin_audit_log_metadataGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        auditLog: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_super_admin_audit_logsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_super_admin_audit_log_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdminAuditLogMetadatum> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      created_at: input.created_at.toISOString(),
    };
  }
}
