import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";
import { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingAdminProducts(props: {
  admin: AdminPayload;
  body: IShoppingProduct.ICreate;
}): Promise<IShoppingProduct> {
  // All authentication already handled by AdminAuth decorator

  // Prepare timestamps for created_at and updated_at
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Insert product
  let created;
  try {
    created = await MyGlobal.prisma.shopping_products.create({
      data: {
        id: v4(),
        shopping_seller_id: props.admin.id,
        code: props.body.code,
        name: props.body.name,
        description: props.body.description,
        main_image_uri: props.body.main_image_uri,
        status: props.body.status,
        business_status: props.body.business_status,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as any).code === "P2002"
    ) {
      throw new HttpException("Duplicate product code", 409);
    }
    throw new HttpException("Failed to create product", 500);
  }

  // Fetch admin info to be exposed as seller summary
  const adminInfo = await MyGlobal.prisma.shopping_admins.findUnique({
    where: { id: props.admin.id },
  });
  if (!adminInfo) {
    throw new HttpException("Admin not found", 404);
  }
  // Structure seller summary for IShoppingSeller.ISummary (id, display_name, status)
  const sellerSummary: IShoppingSeller.ISummary = {
    id: adminInfo.id,
    display_name: adminInfo.name,
    status: adminInfo.status,
  };

  // Return IShoppingProduct compliant response (all relation arrays empty)
  return {
    id: created.id,
    shopping_seller_id: created.shopping_seller_id,
    code: created.code,
    name: created.name,
    description: created.description,
    main_image_uri:
      created.main_image_uri === null ? undefined : created.main_image_uri,
    status: created.status,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
    seller: sellerSummary,
    categories: [],
    skus: [],
    images: [],
    tags: [],
    attributes: [],
  };
}
