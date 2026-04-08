import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductImageAtSummaryTransformer } from "../transformers/MallPlatformProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdImages(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductImage.IRequest;
}): Promise<IPageIMallPlatformProductImage.ISummary> {
  const product = await MyGlobal.prisma.mall_platform_products.findUnique({
    where: { id: props.productId },
    select: {
      id: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  const currentImages =
    await MyGlobal.prisma.mall_platform_product_images.findMany({
      where: {
        mall_platform_product_id: props.productId,
        deleted_at: null,
      },
      orderBy: {
        sort_order: "asc",
      },
      select: {
        id: true,
        mall_platform_product_id: true,
        image_url: true,
        sort_order: true,
        is_main: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const nextImages = [...props.body.images];
  if (currentImages.length !== nextImages.length) {
    throw new HttpException("Invalid image ordering", 400);
  }
  const currentIds = new Set<string>();
  for (const image of currentImages) {
    currentIds.add(image.id);
  }
  const nextIds = new Set<string>();
  for (const image of nextImages) {
    if (nextIds.has(image.id)) {
      throw new HttpException("Duplicated image target", 400);
    }
    if (!currentIds.has(image.id)) {
      throw new HttpException("Unavailable image target", 400);
    }
    nextIds.add(image.id);
  }
  if (nextIds.size !== currentIds.size) {
    throw new HttpException("Invalid image ordering", 400);
  }
  await MyGlobal.prisma.$transaction(
    nextImages.map((image, index) =>
      MyGlobal.prisma.mall_platform_product_images.update({
        where: { id: image.id },
        data: {
          sort_order: index,
          is_main: index === 0,
        },
      }),
    ),
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.mall_platform_product_images.findMany({
    where: {
      mall_platform_product_id: props.productId,
      deleted_at: null,
    },
    orderBy: {
      sort_order: "asc",
    },
    skip,
    take: limit,
    ...MallPlatformProductImageAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_product_images.count({
    where: {
      mall_platform_product_id: props.productId,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: limit > 0 ? Math.ceil(total / limit) : 0,
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformProductImageAtSummaryTransformer.transform,
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
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// import { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorProductsProductIdImages(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductImage.IRequest;
// }): Promise<IPageIMallPlatformProductImage.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_images.findMany({
//     ...MallPlatformProductImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------