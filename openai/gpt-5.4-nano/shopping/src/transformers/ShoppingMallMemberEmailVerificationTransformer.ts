import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallMemberEmailVerificationTransformer {
  export type Payload =
    Prisma.shopping_mall_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Select relation defensively in case FK scalar is not exposed by payload typings
        member: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMemberEmailVerification> {
    return {
      id: input.id,
      shopping_mall_member_id:
        (input as any).shopping_mall_member_id ?? input.member.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
