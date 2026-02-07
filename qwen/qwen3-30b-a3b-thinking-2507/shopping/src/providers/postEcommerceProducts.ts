import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductCollector } from "../collectors/EcommerceProductCollector";
import { EcommerceProductTransformer } from "../transformers/EcommerceProductTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceProducts(props: {
  body: IEcommerceProduct.ICreate;
}): Promise<IEcommerceProduct> {
  const created = await MyGlobal.prisma.ecommerce_products.create({
    data: await EcommerceProductCollector.collect({ body: props.body }),
  });
  const transformedCreated = {
    ...created,
    category: {
      id: created.categories_id,
      created_at: created.created_at,
      updated_at: created.updated_at,
      deleted_at: created.deleted_at,
      name: "",
      description: "",
      parent: null,
    },
  };
  await MyGlobal.prisma.ecommerce_snapshots.create({
    data: {
      id: v4(),
      entity_type: "ecommerce_products",
      entity_id: created.id,
      snapshot_data: JSON.stringify(transformedCreated),
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
  return await EcommerceProductTransformer.transform(transformedCreated);
}
