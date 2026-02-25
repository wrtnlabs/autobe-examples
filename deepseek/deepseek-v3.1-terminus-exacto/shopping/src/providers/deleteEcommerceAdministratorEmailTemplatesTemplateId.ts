import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEcommerceAdministratorEmailTemplatesTemplateId(props: {
  administrator: AdministratorPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Use transaction to ensure atomic operation
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Check if template exists, is not deleted, and is active
    const template = await tx.ecommerce_email_templates.findUniqueOrThrow({
      where: {
        id: props.templateId,
        deleted_at: null,
      },
    });
    // Verify template is active (can only delete active templates)
    if (!template.is_active) {
      throw new HttpException("Cannot delete inactive template", 400);
    }
    // Perform soft deletion using ISO string timestamps instead of Date objects
    const now = new Date().toISOString();
    await tx.ecommerce_email_templates.update({
      where: { id: props.templateId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
