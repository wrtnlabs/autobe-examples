import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCategoryCollector } from "../collectors/EcommerceCategoryCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCategoryTransformer } from "../transformers/EcommerceCategoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdminCategories(props: {
  admin: AdminPayload;
  body: IEcommerceCategory.ICreate;
}): Promise<IEcommerceCategory> {
  // Validate parent category if provided
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parent = await MyGlobal.prisma.ecommerce_categories.findUnique({
      where: { id: props.body.parent_id },
      select: { id: true, deleted_at: true },
    });
    if (parent === null) {
      throw new HttpException("Parent category not found", 404);
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent category is deleted", 404);
    }
  }
  // Check name uniqueness within same parent level
  const existing = await MyGlobal.prisma.ecommerce_categories.findFirst({
    where: {
      parent_id: props.body.parent_id ?? null,
      name: props.body.name,
      deleted_at: null,
    },
    select: { id: true, name: true },
  });
  if (existing !== null) {
    throw new HttpException(
      `Category name "${props.body.name}" already exists at this level`,
      409,
    );
  }
  // Create category using collector
  const record = await MyGlobal.prisma.ecommerce_categories.create({
    data: await EcommerceCategoryCollector.collect({
      body: props.body,
    }),
    ...EcommerceCategoryTransformer.select(),
  });
  return await EcommerceCategoryTransformer.transform(record);
}
