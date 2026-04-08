import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
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
import { EcommerceMallCancellationRequestTransformer } from "./EcommerceMallCancellationRequestTransformer";
import { EcommerceMallCartTransformer } from "./EcommerceMallCartTransformer";
import { EcommerceMallCustomerProfileTransformer } from "./EcommerceMallCustomerProfileTransformer";
import { EcommerceMallOrderTransformer } from "./EcommerceMallOrderTransformer";
import { EcommerceMallRefundRequestTransformer } from "./EcommerceMallRefundRequestTransformer";
import { EcommerceMallReviewTransformer } from "./EcommerceMallReviewTransformer";
import { EcommerceMallShippingAddressTransformer } from "./EcommerceMallShippingAddressTransformer";
import { EcommerceMallWishlistItemTransformer } from "./EcommerceMallWishlistItemTransformer";

export namespace EcommerceMallCustomerTransformer {
  export type Payload = Prisma.ecommerce_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        // Scalar fields
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        // Non-DTO HasMany relations (required for Prisma)
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        refundRequestSnapshots: true,
        // Non-DTO HasOne relations (required for Prisma)
        adminRequest: true,
        // DTO HasOne relations
        profile: EcommerceMallCustomerProfileTransformer.select(),
        wishlist: EcommerceMallWishlistItemTransformer.select(),
        cart: EcommerceMallCartTransformer.select(),
        // DTO HasMany relations
        shippingAddresses: EcommerceMallShippingAddressTransformer.select(),
        orders: EcommerceMallOrderTransformer.select(),
        reviews: EcommerceMallReviewTransformer.select(),
        cancellationRequests:
          EcommerceMallCancellationRequestTransformer.select(),
        refundRequests: EcommerceMallRefundRequestTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallCustomer> {
    if (input.profile === null)
      throw new HttpException("No profile found", 404);
    if (input.wishlist === null)
      throw new HttpException("No wishlist found", 404);
    if (input.cart === null) throw new HttpException("No cart found", 404);
    return {
      id: input.id,
      email: input.email,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      deletedAt:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
      profile: await EcommerceMallCustomerProfileTransformer.transform(
        input.profile,
      ),
      shippingAddresses: await ArrayUtil.asyncMap(
        input.shippingAddresses,
        EcommerceMallShippingAddressTransformer.transform,
      ),
      wishlist: await EcommerceMallWishlistItemTransformer.transform(
        input.wishlist,
      ),
      cart: await EcommerceMallCartTransformer.transform(input.cart),
      orders: await ArrayUtil.asyncMap(
        input.orders,
        EcommerceMallOrderTransformer.transform,
      ),
      reviews: await ArrayUtil.asyncMap(
        input.reviews,
        EcommerceMallReviewTransformer.transform,
      ),
      cancellationRequests: await ArrayUtil.asyncMap(
        input.cancellationRequests,
        EcommerceMallCancellationRequestTransformer.transform,
      ),
      refundRequests: await ArrayUtil.asyncMap(
        input.refundRequests,
        EcommerceMallRefundRequestTransformer.transform,
      ),
    } satisfies IEcommerceMallCustomer;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommerceMallCustomerTransformer {
//       export type Payload = Prisma.ecommerce_mall_customersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             email: true,
//             createdAt: true,
//             updatedAt: true,
//             deletedAt: true,
//             ...
//           },
//         } satisfies Prisma.ecommerce_mall_customersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommerceMallCustomer> {
//         return {
//   id: {string},
//   email: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   profile: {IEcommerceMallCustomerProfile},
//   shippingAddresses: {Array<IEcommerceMallShippingAddress>},
//   wishlist: {IEcommerceMallWishlistItem},
//   cart: {IEcommerceMallCart},
//   orders: {Array<IEcommerceMallOrder>},
//   reviews: {Array<IEcommerceMallReview>},
//   cancellationRequests: {Array<IEcommerceMallCancellationRequest>},
//   refundRequests: {Array<IEcommerceMallRefundRequest>},
//         };
//       }
//     }
//--------------------------------------------------------------