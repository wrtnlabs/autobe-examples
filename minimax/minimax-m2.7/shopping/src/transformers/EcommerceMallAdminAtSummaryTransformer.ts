import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallAdminAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        name: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: { select: { id: true } },
        passwordResets: { select: { id: true } },
        auditLogs: { select: { id: true } },
        reviewedSellerApprovals: { select: { id: true } },
        sellerSuspensionsInitiateds: { select: { id: true } },
        sellerSuspensionsRestoreds: { select: { id: true } },
        promotions: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      name: input.name,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
