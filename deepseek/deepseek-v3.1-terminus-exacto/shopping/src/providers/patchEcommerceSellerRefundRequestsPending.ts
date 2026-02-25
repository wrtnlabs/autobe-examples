import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerRefundRequestsPending(props: {
  seller: SellerPayload;
  body: IEcommerceRefundRequest.IRequest;
}): Promise<IPageIEcommerceRefundRequest.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.ecommerce_refund_requestsWhereInput = {
    seller: { id: props.seller.id },
    deleted_at: null,
    statusHistories: {
      some: {
        status: "pending",
      },
    },
  };
  // Add search filter
  if (props.body.search) {
    whereConditions.reason = { contains: props.body.search };
  }
  // Add date range filters
  if (props.body.requested_at_start || props.body.requested_at_end) {
    whereConditions.requested_at = {};
    if (props.body.requested_at_start) {
      whereConditions.requested_at.gte = new Date(
        props.body.requested_at_start,
      );
    }
    if (props.body.requested_at_end) {
      whereConditions.requested_at.lte = new Date(props.body.requested_at_end);
    }
  }
  // Add status filter
  if (props.body.status !== undefined && props.body.status !== null) {
    whereConditions.statusHistories = {
      some: {
        status: props.body.status,
      },
    };
  }
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_refund_requests.findMany({
      where: whereConditions,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            display_name: true,
            created_at: true,
          },
        },
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_image_url: true,
            account_status: true,
            created_at: true,
          },
        },
        statusHistories: {
          where: { status: "pending" },
          orderBy: { created_at: "desc" },
          take: 1,
        },
      },
      orderBy: { requested_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ecommerce_refund_requests.count({
      where: whereConditions,
    }),
  ]);
  // Transform data to DTO format
  const transformedData = data.map(
    (refundRequest) =>
      ({
        id: refundRequest.id as string & tags.Format<"uuid">,
        reason: refundRequest.reason,
        requested_at: refundRequest.requested_at.toISOString() as string &
          tags.Format<"date-time">,
        refund_window_expires_at:
          refundRequest.refund_window_expires_at.toISOString() as string &
            tags.Format<"date-time">,
        customer: {
          id: refundRequest.customer.id as string & tags.Format<"uuid">,
          email: refundRequest.customer.email as string & tags.Format<"email">,
          display_name: refundRequest.customer.display_name,
          created_at:
            refundRequest.customer.created_at.toISOString() as string &
              tags.Format<"date-time">,
        } satisfies IEcommerceCustomer.ISummary,
        seller: {
          id: refundRequest.seller.id as string & tags.Format<"uuid">,
          email: refundRequest.seller.email as string & tags.Format<"email">,
          shop_name: refundRequest.seller.shop_name,
          shop_description: refundRequest.seller.shop_description,
          logo_image_url: refundRequest.seller.logo_image_url,
          account_status: refundRequest.seller.account_status,
          created_at: refundRequest.seller.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IEcommerceSeller.ISummary,
      }) satisfies IEcommerceRefundRequest.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
