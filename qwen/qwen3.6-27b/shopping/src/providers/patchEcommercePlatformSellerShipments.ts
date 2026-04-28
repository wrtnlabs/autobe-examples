import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformShipmentAtSummaryTransformer } from "../transformers/EcommercePlatformShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommercePlatformShipment.IRequest;
}): Promise<IPageIEcommercePlatformShipment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_platform_shipmentsWhereInput = {
    deleted_at: null,
    ecommerce_platform_seller_id: props.seller.id,
    ...(props.body.carrierName !== undefined &&
      props.body.carrierName !== null &&
      props.body.carrierName !== "" && {
        carrier_name: {
          contains: props.body.carrierName,
          mode: "insensitive",
        },
      }),
    ...(props.body.trackingNumber !== undefined &&
      props.body.trackingNumber !== null &&
      props.body.trackingNumber !== "" && {
        tracking_number: {
          contains: props.body.trackingNumber,
          mode: "insensitive",
        },
      }),
    ...(props.body.shippedAfter !== undefined &&
      props.body.shippedAfter !== null && {
        shipped_at: {
          gte: props.body.shippedAfter,
        },
      }),
    ...(props.body.shippedBefore !== undefined &&
      props.body.shippedBefore !== null && {
        shipped_at: {
          lte: props.body.shippedBefore,
        },
      }),
    ...(props.body.confirmedAfter !== undefined &&
      props.body.confirmedAfter !== null && {
        confirmed_at: {
          gte: props.body.confirmedAfter,
        },
      }),
    ...(props.body.confirmedBefore !== undefined &&
      props.body.confirmedBefore !== null && {
        confirmed_at: {
          lte: props.body.confirmedBefore,
        },
      }),
    ...(props.body.deliveredAfter !== undefined &&
      props.body.deliveredAfter !== null && {
        delivered_at: {
          gte: props.body.deliveredAfter,
        },
      }),
    ...(props.body.deliveredBefore !== undefined &&
      props.body.deliveredBefore !== null && {
        delivered_at: {
          lte: props.body.deliveredBefore,
        },
      }),
    ...(props.body.status === "shipped" && {
      confirmed_at: null,
    }),
    ...(props.body.status === "delivered" && {
      NOT: {
        confirmed_at: null,
      },
    }),
  } satisfies Prisma.ecommerce_platform_shipmentsWhereInput;
  const orderByInput: Prisma.ecommerce_platform_shipmentsOrderByWithRelationInput =
    (
      props.body.sort === "shippedAt"
        ? {
            shipped_at: "desc" as const,
          }
        : props.body.sort === "confirmedAt"
          ? {
              confirmed_at: "desc" as const,
            }
          : props.body.sort === "carrierName"
            ? {
                carrier_name: "asc" as const,
              }
            : props.body.sort === "trackingNumber"
              ? {
                  tracking_number: "asc" as const,
                }
              : {
                  shipped_at: "desc" as const,
                }
    ) satisfies Prisma.ecommerce_platform_shipmentsOrderByWithRelationInput;
  const records = await MyGlobal.prisma.ecommerce_platform_shipments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommercePlatformShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_platform_shipments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformShipmentAtSummaryTransformer.transform,
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
// import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
// import { IPageIEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShipment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformSellerShipments(props: {
//   seller: SellerPayload;
//   body: IEcommercePlatformShipment.IRequest;
// }): Promise<IPageIEcommercePlatformShipment.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_shipments.findMany({
//     ...EcommercePlatformShipmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformShipmentAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------