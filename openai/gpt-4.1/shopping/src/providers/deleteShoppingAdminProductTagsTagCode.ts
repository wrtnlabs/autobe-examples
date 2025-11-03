import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingAdminProductTagsTagCode(props: {
  admin: AdminPayload;
  tagCode: string;
}): Promise<void> {
  // Find the tag by tag_code
  const tag = await MyGlobal.prisma.shopping_product_tags.findUnique({
    where: {
      tag_code: props.tagCode,
    },
  });
  if (!tag) {
    throw new HttpException("Product tag not found.", 404);
  }
  // Remove all assignments for this tag
  await MyGlobal.prisma.shopping_product_tag_assignments.deleteMany({
    where: {
      shopping_product_tag_id: tag.id,
    },
  });
  // Hard delete the tag itself
  await MyGlobal.prisma.shopping_product_tags.delete({
    where: {
      tag_code: props.tagCode,
    },
  });
  // Audit-log this irreversible admin operation
  await MyGlobal.prisma.shopping_audit_logs.create({
    data: {
      id: v4(),
      admin_id: props.admin.id,
      seller_id: null,
      customer_id: null,
      category: "product_tag",
      event_type: "DELETE_TAG",
      ip: null,
      description: `Admin ${props.admin.id} permanently deleted product tag '${props.tagCode}'`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
