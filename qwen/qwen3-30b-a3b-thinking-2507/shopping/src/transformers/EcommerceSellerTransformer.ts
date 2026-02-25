import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceSellerTransformer {
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
  export async function transform(input: Payload): Promise<IEcommerceSeller> {
    return {
      id: input.id,
      email: input.email,
      name: input.name,
      description: input.description,
      status: input.status as "pending" | "approved" | "rejected",
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
