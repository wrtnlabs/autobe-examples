import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductImageAtSummaryTransformer } from "../transformers/EcommerceProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerProductsProductIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceProductImage.IRequest;
}): Promise<IPageIEcommerceProductImage.ISummary> {
  const product = await MyGlobal.prisma.ecommerce_products.findUnique({
    where: { id: props.productId },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new HttpException("Product not found or not owned by seller", 404);
  }
  const configs = props.body.configs;
  const mainConfigs = configs.filter((config) => config.is_main);
  if (mainConfigs.length !== 1) {
    throw new HttpException("Exactly one main image required", 400);
  }
  const positions = configs.map((config) => config.position);
  if (
    new Set(positions).size !== positions.length ||
    positions.some((pos) => pos < 0)
  ) {
    throw new HttpException(
      "Duplicate positions or negative positions not allowed",
      400,
    );
  }
  if (configs.length === 0) {
    await MyGlobal.prisma.ecommerce_product_images.updateMany({
      where: { product: { id: props.productId }, deleted_at: null },
      data: { deleted_at: new Date() },
    });
  } else {
    await MyGlobal.prisma.$transaction([
      // Remove all previous main images
      MyGlobal.prisma.ecommerce_product_images.updateMany({
        where: { product: { id: props.productId }, is_main: true },
        data: { is_main: false },
      }),
      ...configs.map((config) =>
        MyGlobal.prisma.ecommerce_product_images.upsert({
          where: { id: v4() },
          update: {
            image_url: config.image_url,
            is_main: config.is_main,
            position: config.position,
          },
          create: {
            id: v4(),
            product: { connect: { id: props.productId } },
            image_url: config.image_url,
            is_main: config.is_main,
            position: config.position,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        }),
      ),
    ]);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const images = await MyGlobal.prisma.ecommerce_product_images.findMany({
    where: { product: { id: props.productId }, deleted_at: null },
    skip,
    take: limit,
    orderBy: { position: "asc" },
    include: {
      product: {
        include: { category: true },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_product_images.count({
    where: { product: { id: props.productId }, deleted_at: null },
  });
  const imageSummaries = await Promise.all(
    images.map((image) => {
      return EcommerceProductImageAtSummaryTransformer.transform({
        ...image,
        snapshots: [],
      });
    }),
  );
  return {
    data: imageSummaries,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
