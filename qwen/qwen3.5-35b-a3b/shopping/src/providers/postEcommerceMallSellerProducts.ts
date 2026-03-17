import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductCollector } from "../collectors/EcommerceMallProductCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductTransformer } from "../transformers/EcommerceMallProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerProducts(props: {
  seller: SellerPayload;
  body: IEcommerceMallProduct.ICreate;
}): Promise<IEcommerceMallProduct> {
  // Validate name is non-empty
  if (props.body.name.trim().length === 0) {
    throw new HttpException("Name is required", 400);
  }
  // Validate description is non-empty
  if (
    props.body.description === undefined ||
    props.body.description === null ||
    props.body.description.trim().length === 0
  ) {
    throw new HttpException("Description is required", 400);
  }
  // Validate base_price is positive
  if (props.body.base_price <= 0) {
    throw new HttpException("Base price must be positive", 400);
  }
  // Validate category exists and is not deleted
  const category = await MyGlobal.prisma.ecommerce_mall_categories.findUnique({
    where: { id: props.body.category_id },
  });
  if (category === null || category.deleted_at !== null) {
    throw new HttpException("Category not found", 404);
  }
  // Validate slug uniqueness if provided
  if (props.body.slug !== undefined) {
    const existingProduct =
      await MyGlobal.prisma.ecommerce_mall_products.findUnique({
        where: { slug: props.body.slug },
      });
    if (existingProduct !== null && existingProduct.deleted_at === null) {
      throw new HttpException("Slug already exists", 400);
    }
  }
  // Use collector to transform body to database input
  // The seller payload from auth is already validated and safe to use
  const createData = await EcommerceMallProductCollector.collect({
    body: props.body,
    ecommerceMallSellers: {
      id: props.seller.id as string & tags.Format<"uuid">,
    } as IEcommerceMallSeller,
    ecommerceMallSellerSessions: {
      id: props.seller.session_id as string & tags.Format<"uuid">,
    } as IEcommerceMallSeller,
  });
  // Create product with full transformer select to include seller, category, images, and variants
  const created = await MyGlobal.prisma.ecommerce_mall_products.create({
    data: createData,
    ...EcommerceMallProductTransformer.select(),
  });
  // Transform and return the complete product with all nested relations
  return await EcommerceMallProductTransformer.transform(created);
}
