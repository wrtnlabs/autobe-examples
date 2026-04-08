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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShipmentAtSummaryTransformer } from "../transformers/MallPlatformShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerShipments(props: {
  customer: CustomerPayload;
  body: IMallPlatformShipment.IRequest;
}): Promise<IPageIMallPlatformShipment.ISummary> {
  const current: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (current - 1) * limit;
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined ||
    props.body.shippedAtFrom !== undefined ||
    props.body.shippedAtTo !== undefined ||
    props.body.deliveredAtFrom !== undefined ||
    props.body.deliveredAtTo !== undefined
  ) {
    throw new HttpException(
      "Date range filtering is not supported in this endpoint.",
      400,
    );
  }
  if (
    props.body.customerId !== undefined &&
    props.body.customerId !== props.customer.id
  ) {
    return {
      pagination: {
        current,
        limit,
        records: 0,
        pages: 0,
      },
      data: [],
    };
  }
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "newest" &&
    props.body.sort !== "oldest" &&
    props.body.sort !== "carrierName" &&
    props.body.sort !== "trackingNumber" &&
    props.body.sort !== "status"
  ) {
    throw new HttpException("Unsupported sort key.", 400);
  }
  const records = await MyGlobal.prisma.mall_platform_shipments.findMany({
    where: {
      deleted_at: null,
      order: {
        customer_id: props.customer.id,
      },
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.carrierName !== undefined && {
        carrier_name: props.body.carrierName,
      }),
      ...(props.body.trackingNumber !== undefined && {
        tracking_number: props.body.trackingNumber,
      }),
      ...(props.body.sellerId !== undefined && {
        mall_platform_seller_id: props.body.sellerId,
      }),
    } satisfies Prisma.mall_platform_shipmentsWhereInput,
    orderBy:
      props.body.sort === "carrierName"
        ? { carrier_name: "asc" }
        : props.body.sort === "trackingNumber"
          ? { tracking_number: "asc" }
          : props.body.sort === "status"
            ? { status: "asc" }
            : props.body.sort === "oldest"
              ? { created_at: "asc" }
              : { created_at: "desc" },
    skip,
    take: limit,
    ...MallPlatformShipmentAtSummaryTransformer.select(),
  });
  const recordsCount = await MyGlobal.prisma.mall_platform_shipments.count({
    where: {
      deleted_at: null,
      order: {
        customer_id: props.customer.id,
      },
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.carrierName !== undefined && {
        carrier_name: props.body.carrierName,
      }),
      ...(props.body.trackingNumber !== undefined && {
        tracking_number: props.body.trackingNumber,
      }),
      ...(props.body.sellerId !== undefined && {
        mall_platform_seller_id: props.body.sellerId,
      }),
    } satisfies Prisma.mall_platform_shipmentsWhereInput,
  });
  return {
    pagination: {
      current,
      limit,
      records: recordsCount,
      pages: recordsCount === 0 ? 0 : Math.ceil(recordsCount / limit),
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
// export async function patchMallPlatformCustomerShipments(props: {
//   customer: CustomerPayload;
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