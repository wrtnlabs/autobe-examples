import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallCartTransformer } from "./EcommerceMallCartTransformer";
import { EcommerceMallCustomerProfileTransformer } from "./EcommerceMallCustomerProfileTransformer";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "./EcommerceMallShippingAddressAtSummaryTransformer";
import { EcommerceMallWishlistItemAtInvertTransformer } from "./EcommerceMallWishlistItemAtInvertTransformer";

export namespace EcommerceMallCustomerAtInvertTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<
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
        profile: EcommerceMallCustomerProfileTransformer.select(),
        shippingAddresses: {
          ...EcommerceMallShippingAddressAtSummaryTransformer.select(),
          orderBy: [{ is_default: "desc" }, { created_at: "desc" }],
        } satisfies Prisma.ecommerce_mall_shipping_addressesFindManyArgs,
        cart: EcommerceMallCartTransformer.select(),
        wishlist: EcommerceMallWishlistItemAtInvertTransformer.select(),
        sessions: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_customer_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_customer_password_resetsFindManyArgs,
        emailVerifications: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_customer_email_verificationsFindManyArgs,
        adminRequest: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_admin_request_of_customersFindManyArgs,
        orders: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_ordersFindManyArgs,
        cancellationRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_cancellation_requestsFindManyArgs,
        refundRequests: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_refund_requestsFindManyArgs,
        refundRequestSnapshots: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs,
        reviews: {
          select: { id: true },
        } satisfies Prisma.ecommerce_mall_reviewsFindManyArgs,
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer.IInvert> {
    return {
      id: input.id,
      email: input.email,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at != null ? toISOStringSafe(input.deleted_at) : null,
      profile: input.profile
        ? await EcommerceMallCustomerProfileTransformer.transform(input.profile)
        : (null as never),
      shippingAddresses: await ArrayUtil.asyncMap(
        input.shippingAddresses,
        EcommerceMallShippingAddressAtSummaryTransformer.transform,
      ),
      cart: input.cart
        ? await EcommerceMallCartTransformer.transform(input.cart)
        : (undefined as never),
      wishlist: input.wishlist
        ? await EcommerceMallWishlistItemAtInvertTransformer.transform(
            input.wishlist,
          )
        : (undefined as never),
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerAtInvertTransformer {
//       export type Payload = Prisma.ecommerce_mall_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomer.IInvert> {
//         return {
//   id: {string},
//   email: {string},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   profile: {IEcommerceMallCustomerProfile},
//   shippingAddresses: {Array<IEcommerceMallShippingAddress.ISummary>},
//   cart: {IEcommerceMallCart},
//   wishlist: {IEcommerceMallWishlistItem.IInvert},
//         };
//       }
//     }
//--------------------------------------------------------------