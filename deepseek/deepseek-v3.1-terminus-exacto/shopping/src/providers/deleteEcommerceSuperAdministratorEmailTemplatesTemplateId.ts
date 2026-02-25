import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteEcommerceSuperAdministratorEmailTemplatesTemplateId(props: {
  superAdministrator: SuperadministratorPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Check if template exists and not already deleted
  const template =
    await MyGlobal.prisma.ecommerce_email_templates.findUniqueOrThrow({
      where: { id: props.templateId },
    });
  // 2. Ensure template is not already deleted
  if (template.deleted_at !== null) {
    throw new HttpException(
      `Email template ${props.templateId} already deleted`,
      409,
    );
  }
  // 3. Ensure template is active for deletion (only active templates can be deleted)
  if (template.is_active !== true) {
    throw new HttpException(
      `Email template ${props.templateId} is not active and cannot be deleted`,
      400,
    );
  }
  // 4. Perform soft deletion by updating deleted_at and updated_at
  const now = toISOStringSafe(new Date()); // Get current time as ISO string
  await MyGlobal.prisma.ecommerce_email_templates.update({
    where: { id: props.templateId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // Return void (204 No Content)
}
