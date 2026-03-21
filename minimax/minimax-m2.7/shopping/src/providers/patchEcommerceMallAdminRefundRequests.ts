import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallRefundRequestTransformer } from "../transformers/EcommerceMallRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminRefundRequests(props: {
  admin: AdminPayload;
  body: IEcommerceMallRefundRequest.IRequest;
}): Promise<IPageIEcommerceMallRefundRequest> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.customer_id !== undefined && {
      ecommerce_mall_customer_id: props.body.customer_id,
    }),
    ...(props.body.seller_id !== undefined && {
      ecommerce_mall_seller_id: props.body.seller_id,
    }),
    ...(props.body.order_item_id !== undefined && {
      ecommerce_mall_order_item_id: props.body.order_item_id,
    }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_to !== undefined && {
        created_at: {
          gte: new Date(props.body.created_at_from),
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_to === undefined && {
        created_at: { gte: new Date(props.body.created_at_from) },
      }),
    ...(props.body.created_at_from === undefined &&
      props.body.created_at_to !== undefined && {
        created_at: { lte: new Date(props.body.created_at_to) },
      }),
    ...(props.body.reason_keyword !== undefined && {
      reason: { contains: props.body.reason_keyword, mode: "insensitive" },
    }),
  } satisfies Prisma.ecommerce_mall_refund_requestsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reason: true,
      status: true,
      seller_response_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      orderItem: {
        select: {
          id: true,
          quantity: true,
          unit_price: true,
          status: true,
          created_at: true,
          order: {
            select: {
              id: true,
              order_number: true,
            },
          },
          productSnapshot: {
            select: {
              id: true,
              name: true,
              description: true,
              base_price: true,
              category_name: true,
              created_at: true,
              seller: {
                select: {
                  id: true,
                  email: true,
                  approval_status: true,
                  created_at: true,
                  profile: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    },
                  },
                },
              },
            },
          },
          sellerProfileSnapshot: {
            select: {
              id: true,
              shop_name: true,
              shop_description: true,
              logo_url: true,
              created_at: true,
            },
          },
        },
      } satisfies Prisma.ecommerce_mall_order_itemsFindManyArgs,
      seller: {
        select: {
          id: true,
          email: true,
          approval_status: true,
          created_at: true,
          profile: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      } satisfies Prisma.ecommerce_mall_sellersFindManyArgs,
      refundRequestSnapshots: {
        select: {
          id: true,
          snapshot_reason: true,
          snapshot_status: true,
          seller_response: true,
          seller_response_reason: true,
          created_at: true,
          updated_at: true,
          customer: {
            select: {
              id: true,
              email: true,
              created_at: true,
              profile: {
                select: {
                  display_name: true,
                },
              },
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              approval_status: true,
              created_at: true,
              profile: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      } satisfies Prisma.ecommerce_mall_refund_request_snapshotsFindManyArgs,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallRefundRequestTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
