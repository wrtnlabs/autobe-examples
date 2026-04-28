import { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformRefundRequestCollector {
  export async function collect(props: {
    body: IEcommercePlatformRefundRequest.ICreate;
  }) {
    // Derive seller_profile_id via indirect reference chain:
    // order_item → product_variant → product → seller_profile
    const orderItem =
      await MyGlobal.prisma.ecommerce_platform_order_items.findFirstOrThrow({
        where: { id: props.body.order_item_id },
      });
    const productVariant =
      await MyGlobal.prisma.ecommerce_platform_product_variants.findFirstOrThrow(
        {
          where: { id: orderItem.ecommerce_platform_product_variant_id },
        },
      );
    const product =
      await MyGlobal.prisma.ecommerce_platform_products.findFirstOrThrow({
        where: { id: productVariant.ecommerce_platform_product_id },
      });
    return {
      id: v4(),
      refund_reason: props.body.refund_reason,
      status: "pending",
      responded_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      orderItem: { connect: { id: props.body.order_item_id } },
      sellerProfile: {
        connect: { id: product.ecommerce_platform_seller_profile_id },
      },
    } satisfies Prisma.ecommerce_platform_refund_requestsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformRefundRequestCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformRefundRequest.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       refund_reason: ...,
//       status: ...,
//       responded_at: ...,
//       created_at: ...,
//       updated_at: ...,
//       orderItem: ...,
//       sellerProfile: ...,
//       refundRequestSnapshots: ...,
//           } satisfies Prisma.ecommerce_platform_refund_requestsCreateInput;
//         }
//       }
//--------------------------------------------------------------