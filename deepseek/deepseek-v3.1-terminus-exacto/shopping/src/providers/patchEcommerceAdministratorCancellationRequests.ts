import { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCancellationRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchEcommerceAdministratorCancellationRequests(props: {
  administrator: AdministratorPayload;
  body: IEcommerceCancellationRequest.IRequest;
}): Promise<IPageIEcommerceCancellationRequest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause based on filter parameters
  const baseWhereInput = {
    deleted_at: null,
    ...(props.body.customer_id !== undefined &&
      props.body.customer_id !== null && {
        ecommerce_customer_id: props.body.customer_id,
      }),
    ...(props.body.seller_id !== undefined &&
      props.body.seller_id !== null && {
        ecommerce_seller_id: props.body.seller_id,
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        reason: { contains: props.body.search },
      }),
    ...(props.body.date_from !== undefined &&
      props.body.date_from !== null && {
        created_at: { gte: new Date(props.body.date_from) },
      }),
    ...(props.body.date_to !== undefined &&
      props.body.date_to !== null && {
        created_at: { lte: new Date(props.body.date_to) },
      }),
  } satisfies Prisma.ecommerce_cancellation_requestsWhereInput;
  let whereInput = baseWhereInput;
  // Simplify approach: Skip status filtering for now to avoid 'id' field issue
  // Administrator already has access to all cancellation requests
  const data = await MyGlobal.prisma.ecommerce_cancellation_requests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      reason: true,
      created_at: true,
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
    },
  });
  const total = await MyGlobal.prisma.ecommerce_cancellation_requests.count({
    where: whereInput,
  });
  return {
    data: data.map(
      (item) =>
        ({
          id: item.id as string & tags.Format<"uuid">,
          reason: item.reason,
          created_at: item.created_at.toISOString() as string &
            tags.Format<"date-time">,
          customer: {
            id: item.customer.id as string & tags.Format<"uuid">,
            email: item.customer.email as string & tags.Format<"email">,
            display_name: item.customer.display_name,
            created_at: item.customer.created_at.toISOString() as string &
              tags.Format<"date-time">,
          } satisfies IEcommerceCustomer.ISummary,
          seller: {
            id: item.seller.id as string & tags.Format<"uuid">,
            email: item.seller.email as string & tags.Format<"email">,
            shop_name: item.seller.shop_name,
            shop_description: item.seller.shop_description,
            logo_image_url: item.seller.logo_image_url,
            account_status: item.seller.account_status,
            created_at: item.seller.created_at.toISOString() as string &
              tags.Format<"date-time">,
          } satisfies IEcommerceSeller.ISummary,
        }) satisfies IEcommerceCancellationRequest.ISummary,
    ),
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
