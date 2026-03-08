import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallCustomerProfileTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<
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
        deleted_at: true,
        customerSessions: {
          select: {},
        } satisfies Prisma.ecommerce_mall_customer_sessionsFindManyArgs,
        passwordResets: {
          select: {},
        } satisfies Prisma.ecommerce_mall_admin_password_resetsFindManyArgs,
        emailVerifications: {
          select: {},
        } satisfies Prisma.ecommerce_mall_customer_email_verificationsFindManyArgs,
        wishlists: {
          select: {},
        } satisfies Prisma.ecommerce_mall_wishlistsFindManyArgs,
        shoppingCarts: {
          select: {},
        } satisfies Prisma.ecommerce_mall_shopping_cartsFindManyArgs,
        orders: {
          select: {},
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
        cancellationRequests: {
          select: {},
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
        reviews: {
          select: {},
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
        adminRequestRequests: {
          select: {},
        } satisfies Prisma.ecommerce_mall_admin_request_request_of_customersFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomerProfile> {
    return {
      id: input.id,
      displayName: "",
      phoneNumber: undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
