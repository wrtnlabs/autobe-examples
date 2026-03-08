import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<{
    select: {
      id: true;
      email: true;
      is_banned: true;
      created_at: true;
      updated_at: true;
      deleted_at: true;
    };
  }>;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer.ISummary> {
    // Extract display name from email (first part before @) since no profile table exists
    const displayName = input.email.split("@")[0] || input.id;
    return {
      id: input.id,
      email: input.email,
      isBanned: input.is_banned,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      customerProfile: {
        displayName: displayName,
        phoneNumber: undefined,
        createdAt: input.created_at.toISOString(),
        updatedAt: input.updated_at.toISOString(),
      },
    };
  }
}
