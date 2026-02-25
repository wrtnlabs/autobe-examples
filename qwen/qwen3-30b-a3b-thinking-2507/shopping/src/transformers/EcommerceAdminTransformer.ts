import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceAdminTransformer {
  export type Payload = Prisma.ecommerce_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        adminSessions: {
          select: {},
        } satisfies Prisma.ecommerce_admin_sessionsFindManyArgs,
        passwordResets: {
          select: {},
        } satisfies Prisma.ecommerce_admin_password_resetsFindManyArgs,
        auditLogs: {
          select: {},
        } satisfies Prisma.ecommerce_admin_audit_logsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IEcommerceAdmin> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
