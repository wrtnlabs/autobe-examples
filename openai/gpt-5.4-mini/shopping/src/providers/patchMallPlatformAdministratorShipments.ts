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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformShipmentAtSummaryTransformer } from "../transformers/MallPlatformShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorShipments(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformShipment.IRequest;
}): Promise<IPageIMallPlatformShipment.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  if (limit < 1) throw new HttpException("Limit must be at least 1", 400);
  if (
    props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined ||
    props.body.shippedAtFrom !== undefined ||
    props.body.shippedAtTo !== undefined ||
    props.body.deliveredAtFrom !== undefined ||
    props.body.deliveredAtTo !== undefined
  ) {
    throw new HttpException(
      "Date range filtering is not supported in this endpoint implementation",
      400,
    );
  }
  if (
    props.body.sort !== undefined &&
    props.body.sort !== "oldest" &&
    props.body.sort !== "status" &&
    props.body.sort !== "carrierName" &&
    props.body.sort !== "trackingNumber"
  ) {
    throw new HttpException("Unsupported sort mode", 400);
  }
  const where: Prisma.mall_platform_shipmentsWhereInput = {
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.carrierName !== undefined && {
      carrier_name: { contains: props.body.carrierName, mode: "insensitive" },
    }),
    ...(props.body.trackingNumber !== undefined && {
      tracking_number: {
        contains: props.body.trackingNumber,
        mode: "insensitive",
      },
    }),
    ...(props.body.sellerId !== undefined && {
      mall_platform_seller_id: props.body.sellerId,
    }),
    ...(props.body.customerId !== undefined && {
      order: {
        customer_id: props.body.customerId,
      },
    }),
  };
  const records = await MyGlobal.prisma.mall_platform_shipments.findMany({
    where,
    orderBy:
      props.body.sort === "oldest"
        ? { created_at: "asc" }
        : props.body.sort === "status"
          ? { status: "asc" }
          : props.body.sort === "carrierName"
            ? { carrier_name: "asc" }
            : props.body.sort === "trackingNumber"
              ? { tracking_number: "asc" }
              : { created_at: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    ...MallPlatformShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_shipments.count({ where });
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
// export async function patchMallPlatformAdministratorShipments(props: {
//   administrator: AdministratorPayload;
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