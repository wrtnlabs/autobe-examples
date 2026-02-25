import { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceEmailTemplateTransformer } from "../transformers/EcommerceEmailTemplateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdministratorEmailTemplatesTemplateId(props: {
  administrator: AdministratorPayload;
  templateId: string & tags.Format<"uuid">;
  body: IEcommerceEmailTemplate.IUpdate;
}): Promise<IEcommerceEmailTemplate> {
  // Verify the template exists and is not soft-deleted
  const existing = await MyGlobal.prisma.ecommerce_email_templates.findFirst({
    where: {
      id: props.templateId,
      deleted_at: null,
    },
  });
  if (existing === null) {
    throw new HttpException("Email template not found", 404);
  }
  // Remove code uniqueness validation since IUpdate doesn't have code property
  // Prepare update data with partial update semantics
  const updateData: Prisma.ecommerce_email_templatesUpdateInput = {
    updated_at: new Date(),
    version: existing.version + 1,
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.category !== undefined && { category: props.body.category }),
    ...(props.body.subject !== undefined && { subject: props.body.subject }),
    ...(props.body.html_content !== undefined && {
      html_content: props.body.html_content,
    }),
    ...(props.body.text_content !== undefined && {
      text_content: props.body.text_content,
    }),
    ...(props.body.description !== undefined && {
      description:
        props.body.description === null ? null : props.body.description,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    // Remove code field from update data since IUpdate doesn't support it
  };
  // Perform the update
  await MyGlobal.prisma.ecommerce_email_templates.update({
    where: { id: props.templateId },
    data: updateData,
  });
  // Fetch the updated record with transformer
  const updated =
    await MyGlobal.prisma.ecommerce_email_templates.findUniqueOrThrow({
      where: { id: props.templateId },
      ...EcommerceEmailTemplateTransformer.select(),
    });
  // Transform to response DTO
  return await EcommerceEmailTemplateTransformer.transform(updated);
}
