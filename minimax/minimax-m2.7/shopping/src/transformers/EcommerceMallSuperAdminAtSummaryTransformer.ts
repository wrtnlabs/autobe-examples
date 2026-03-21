import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSuperAdminAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_super_adminsGetPayload<
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
        sessions: {
          select: { id: true },
        },
        passwordResets: {
          select: { id: true },
        },
        auditLogs: {
          select: { id: true },
        },
        reviewedAdminRequests: {
          select: { id: true },
        },
        reviewedSellerAdminRequests: {
          select: { id: true },
        },
        adminPromotions: {
          select: { id: true },
        },
      },
    } satisfies Prisma.ecommerce_mall_super_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallSuperAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
