import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallMemberTransformer {
  export type Payload = Prisma.shopping_mall_membersGetPayload<
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
        } satisfies Prisma.shopping_mall_member_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_member_password_resetsFindManyArgs,
        emailVerifications: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_member_email_verificationsFindManyArgs,
        oauthConnections: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_member_oauth_connectionsFindManyArgs,
        sellerProducts: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_productsFindManyArgs,
        wishlists: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_wishlistsFindManyArgs,
        carts: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_cartsFindManyArgs,
        orders: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_ordersFindManyArgs,
        reviews: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_reviewsFindManyArgs,
        addresses: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_addressesFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMember> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
