import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductTransformer } from "../transformers/MallPlatformProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformAdministratorProductsProductId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProduct.IUpdate;
}): Promise<IMallPlatformProduct> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const current = await prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
        category_id: true,
        name: true,
        description: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
    if (current.deleted_at !== null) {
      throw new HttpException("Product is not editable", 409);
    }
    if (props.body.categoryId !== undefined && props.body.categoryId !== null) {
      await prisma.mall_platform_categories.findUniqueOrThrow({
        where: { id: props.body.categoryId },
      });
    }
    await prisma.mall_platform_products.update({
      where: { id: props.productId },
      data: {
        ...(props.body.name !== undefined ? { name: props.body.name } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.categoryId !== undefined
          ? { category_id: props.body.categoryId }
          : {}),
        ...(props.body.basePrice !== undefined
          ? { base_price: props.body.basePrice }
          : {}),
        updated_at: new Date(),
      },
    });
    const updated = await prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      ...MallPlatformProductTransformer.select(),
    });
    return await MallPlatformProductTransformer.transform(updated);
  });
}
