import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallMemberRefundRequestsId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallRefundRequest> {
  // Retrieve the refund request with all required fields
  const record =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirstOrThrow({
      select: {
        id: true,
        order_item_id: true,
        approved_by_seller_id: true,
        rejected_by_seller_id: true,
        reason: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshots: true,
        approvedBySeller: {
          select: {
            email: true,
            created_at: true,
            updated_at: true,
            display_name: true,
            approval_status: true,
            id: true,
            deleted_at: true,
            password_hash: true,
            rejection_reason: true,
            is_suspended: true,
          },
        },
        rejectedBySeller: {
          select: {
            email: true,
            created_at: true,
            updated_at: true,
            display_name: true,
            approval_status: true,
            id: true,
            deleted_at: true,
            password_hash: true,
            rejection_reason: true,
            is_suspended: true,
          },
        },
        snapshot: true,
        item: {
          select: {
            id: true,
            quantity: true,
            unit_price: true,
            subtotal: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            order: {
              select: {
                order_number: true,
                ecommerce_mall_member_id: true,
              },
            },
            productVariant: {
              select: {
                sku_code: true,
                price: true,
              },
            },
            seller: {
              select: {
                display_name: true,
              },
            },
          },
        },
      },
      where: {
        id: props.id,
        deleted_at: null,
      },
    });
  // Verify the member owns the order associated with this refund request
  // Check if the order item belongs to an order placed by this member
  if (record.item.order.ecommerce_mall_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceMallRefundRequestTransformer.transform(record);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
// import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallMemberRefundRequestsId(props: {
//   member: MemberPayload;
//   id: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallRefundRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_refund_requests.findFirstOrThrow({
//     ...EcommerceMallRefundRequestTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallRefundRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------