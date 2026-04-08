import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformShipmentAtSummaryTransformer } from "../transformers/MallPlatformShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerShipments(props: {
  seller: SellerPayload;
  body: IMallPlatformShipment.IRequest;
}): Promise<IPageIMallPlatformShipment.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  if (page < 1) throw new HttpException("Invalid page", 400);
  if (limit < 1 || limit > 100) throw new HttpException("Invalid limit", 400);
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "newest" &&
    props.body.sort !== "oldest" &&
    props.body.sort !== "status_asc" &&
    props.body.sort !== "status_desc"
  ) {
    throw new HttpException("Invalid sort", 400);
  }
  if (
    props.body.status !== undefined &&
    props.body.status !== "preparing" &&
    props.body.status !== "shipped" &&
    props.body.status !== "delivered" &&
    props.body.status !== "cancelled"
  ) {
    throw new HttpException("Invalid status", 400);
  }
  const where: Prisma.mall_platform_shipmentsWhereInput = {
    deleted_at: null,
    seller: {
      id: props.seller.id,
    },
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.carrierName !== undefined &&
      props.body.carrierName.length > 0 && {
        carrier_name: {
          contains: props.body.carrierName,
          mode: "insensitive",
        },
      }),
    ...(props.body.trackingNumber !== undefined &&
      props.body.trackingNumber.length > 0 && {
        tracking_number: {
          contains: props.body.trackingNumber,
          mode: "insensitive",
        },
      }),
    ...(props.body.trackingUrl !== undefined && {
      tracking_url: props.body.trackingUrl,
    }),
    ...(props.body.orderNumber !== undefined &&
      props.body.orderNumber.length > 0 && {
        order: {
          order_number: {
            contains: props.body.orderNumber,
            mode: "insensitive",
          },
        },
      }),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        OR: [
          {
            carrier_name: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            tracking_number: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            order: {
              order_number: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          },
        ],
      }),
  };
  const orderBy: Prisma.mall_platform_shipmentsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : props.body.sort === "status_asc"
        ? { status: "asc" }
        : props.body.sort === "status_desc"
          ? { status: "desc" }
          : { created_at: "desc" };
  const records = await MyGlobal.prisma.mall_platform_shipments.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy,
    ...MallPlatformShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_shipments.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformShipmentAtSummaryTransformer.transform,
    ),
  };
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
// import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
// import { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerShipments(props: {
//   seller: SellerPayload;
//   body: IMallPlatformShipment.IRequest;
// }): Promise<IPageIMallPlatformShipment.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_shipments.findMany({
//     ...MallPlatformShipmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformShipmentAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------