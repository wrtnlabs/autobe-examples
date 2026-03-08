import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminTransformer {
  export type Payload = Prisma.ecommerce_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        is_banned: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        sessions: true,
        passwordResetRequests: true,
        emailVerifications: true,
        auditLogs: true,
        adminRequestSnapshotsChangedBies: true,
        adminRequests: true,
      },
    } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdmin> {
    return {
      id: input.id,
      email: input.email,
      is_banned: input.is_banned,
      ban_reason: input.ban_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    } satisfies IEcommerceMallAdmin;
  }
}
