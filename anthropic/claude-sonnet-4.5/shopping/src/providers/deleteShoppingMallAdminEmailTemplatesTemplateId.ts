import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminEmailTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, templateId } = props;

  // Verify template exists before deletion (throws 404 if not found)
  await MyGlobal.prisma.shopping_mall_email_templates.findUniqueOrThrow({
    where: { id: templateId },
  });

  // Perform hard delete (schema has no deleted_at field)
  await MyGlobal.prisma.shopping_mall_email_templates.delete({
    where: { id: templateId },
  });
}
