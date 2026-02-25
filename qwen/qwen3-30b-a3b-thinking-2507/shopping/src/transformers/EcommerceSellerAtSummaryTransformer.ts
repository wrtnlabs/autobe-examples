import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSellerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        name: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        emailVerifications: true,
        passwordResets: true,
        profiles: true,
      },
    } satisfies Prisma.ecommerce_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceSeller.ISummary> {
    return {
      id: input.id,
      name: input.name ?? undefined,
      status: input.status as IEcommerceSeller.ISummary["status"],
      created_at: input.created_at.toISOString(),
    };
  }
}
