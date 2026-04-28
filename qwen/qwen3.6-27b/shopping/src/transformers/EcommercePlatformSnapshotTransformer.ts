import { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotCancellationRequest";
import { IEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotOrderItem";
import { IEcommercePlatformSnapshotProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotProduct";
import { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommercePlatformSnapshotCancellationRequestTransformer } from "./EcommercePlatformSnapshotCancellationRequestTransformer";
import { EcommercePlatformSnapshotOrderItemTransformer } from "./EcommercePlatformSnapshotOrderItemTransformer";
import { EcommercePlatformSnapshotProductTransformer } from "./EcommercePlatformSnapshotProductTransformer";
import { EcommercePlatformSnapshotRefundRequestTransformer } from "./EcommercePlatformSnapshotRefundRequestTransformer";
import { EcommercePlatformSnapshotReviewTransformer } from "./EcommercePlatformSnapshotReviewTransformer";
import { EcommercePlatformSnapshotSellerProfileTransformer } from "./EcommercePlatformSnapshotSellerProfileTransformer";
import { EcommercePlatformSnapshotVariantAtSummaryTransformer } from "./EcommercePlatformSnapshotVariantAtSummaryTransformer";

export namespace EcommercePlatformSnapshotTransformer {
  export type Payload = Prisma.ecommerce_platform_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        created_at: true,
        snapshotProduct: EcommercePlatformSnapshotProductTransformer.select(),
        variantSnapshot:
          EcommercePlatformSnapshotVariantAtSummaryTransformer.select(),
        sellerProfileSnapshot:
          EcommercePlatformSnapshotSellerProfileTransformer.select(),
        orderItemSnapshot:
          EcommercePlatformSnapshotOrderItemTransformer.select(),
        reviewSnapshot: EcommercePlatformSnapshotReviewTransformer.select(),
        cancellationRequest:
          EcommercePlatformSnapshotCancellationRequestTransformer.select(),
        refundRequest:
          EcommercePlatformSnapshotRefundRequestTransformer.select(),
      },
    } satisfies Prisma.ecommerce_platform_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommercePlatformSnapshot> {
    return {
      id: input.id,
      entityType: input.entity_type,
      createdAt: input.created_at.toISOString(),
      snapshotProduct: input.snapshotProduct
        ? await EcommercePlatformSnapshotProductTransformer.transform(
            input.snapshotProduct,
          )
        : null,
      variantSnapshot: input.variantSnapshot
        ? await EcommercePlatformSnapshotVariantAtSummaryTransformer.transform(
            input.variantSnapshot,
          )
        : null,
      sellerProfileSnapshot: input.sellerProfileSnapshot
        ? await EcommercePlatformSnapshotSellerProfileTransformer.transform(
            input.sellerProfileSnapshot,
          )
        : null,
      orderItemSnapshot: input.orderItemSnapshot
        ? await EcommercePlatformSnapshotOrderItemTransformer.transform(
            input.orderItemSnapshot,
          )
        : null,
      reviewSnapshot: input.reviewSnapshot
        ? await EcommercePlatformSnapshotReviewTransformer.transform(
            input.reviewSnapshot,
          )
        : null,
      cancellationRequest: input.cancellationRequest
        ? await EcommercePlatformSnapshotCancellationRequestTransformer.transform(
            input.cancellationRequest,
          )
        : null,
      refundRequest: input.refundRequest
        ? await EcommercePlatformSnapshotRefundRequestTransformer.transform(
            input.refundRequest,
          )
        : null,
    } satisfies IEcommercePlatformSnapshot;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace EcommercePlatformSnapshotTransformer {
//       export type Payload = Prisma.ecommerce_platform_snapshotsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             entity_type: true,
//             created_at: true,
//             sellerProfileSnapshot: EcommercePlatformSnapshotSellerProfileTransformer.select(),
//             variantSnapshot: EcommercePlatformSnapshotVariantAtSummaryTransformer.select(),
//             snapshotProduct: EcommercePlatformSnapshotProductTransformer.select(),
//             refundRequest: EcommercePlatformSnapshotRefundRequestTransformer.select(),
//             orderItemSnapshot: EcommercePlatformSnapshotOrderItemTransformer.select(),
//             reviewSnapshot: EcommercePlatformSnapshotReviewTransformer.select(),
//             cancellationRequest: EcommercePlatformSnapshotCancellationRequestTransformer.select(),
//           },
//         } satisfies Prisma.ecommerce_platform_snapshotsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IEcommercePlatformSnapshot> {
//         return {
//   id: {string},
//   entityType: {string},
//   createdAt: {string},
//   snapshotProduct: input.snapshotProduct ? await EcommercePlatformSnapshotProductTransformer.transform(input.snapshotProduct) : null,
//   variantSnapshot: input.variantSnapshot ? await EcommercePlatformSnapshotVariantAtSummaryTransformer.transform(input.variantSnapshot) : null,
//   sellerProfileSnapshot: input.sellerProfileSnapshot ? await EcommercePlatformSnapshotSellerProfileTransformer.transform(input.sellerProfileSnapshot) : null,
//   orderItemSnapshot: input.orderItemSnapshot ? await EcommercePlatformSnapshotOrderItemTransformer.transform(input.orderItemSnapshot) : null,
//   reviewSnapshot: input.reviewSnapshot ? await EcommercePlatformSnapshotReviewTransformer.transform(input.reviewSnapshot) : null,
//   cancellationRequest: input.cancellationRequest ? await EcommercePlatformSnapshotCancellationRequestTransformer.transform(input.cancellationRequest) : null,
//   refundRequest: input.refundRequest ? await EcommercePlatformSnapshotRefundRequestTransformer.transform(input.refundRequest) : null,
//         };
//       }
//     }
//--------------------------------------------------------------