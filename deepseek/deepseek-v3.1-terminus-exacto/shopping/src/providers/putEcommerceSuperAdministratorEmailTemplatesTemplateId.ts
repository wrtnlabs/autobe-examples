import { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceEmailTemplateTransformer } from "../transformers/EcommerceEmailTemplateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSuperAdministratorEmailTemplatesTemplateId(props: {
  superAdministrator: SuperadministratorPayload;
  templateId: string & tags.Format<"uuid">;
  body: IEcommerceEmailTemplate.IUpdate;
}): Promise<IEcommerceEmailTemplate> {
  const template =
    await MyGlobal.prisma.ecommerce_email_templates.findUniqueOrThrow({
      where: { id: props.templateId, deleted_at: null },
    });
  // REMOVED CODE PROPERTY ACCESS - NOT IN IUpdate INTERFACE
  // if (props.body.code && props.body.code !== template.code) {
  //   const existing = await MyGlobal.prisma.ecommerce_email_templates.findFirst({
  //     where: {
  //       code: props.body.code,
  //       deleted_at: null,
  //       id: { not: props.templateId },
  //     },
  //   });
  //   if (existing) {
  //     throw new HttpException("Email template code already exists", 400);
  //   }
  // }
  const updated = await MyGlobal.prisma.ecommerce_email_templates.update({
    where: { id: props.templateId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.category !== undefined && {
        category: props.body.category,
      }),
      ...(props.body.subject !== undefined && { subject: props.body.subject }),
      ...(props.body.html_content !== undefined && {
        html_content: props.body.html_content,
      }),
      ...(props.body.text_content !== undefined && {
        text_content: props.body.text_content,
      }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.is_active !== undefined && {
        is_active: props.body.is_active,
      }),
      // REMOVED CODE PROPERTY UPDATE - NOT IN IUpdate INTERFACE
      // ...(props.body.code !== undefined && { code: props.body.code }),
      version: template.version + 1,
      updated_at: new Date(),
    } satisfies Prisma.ecommerce_email_templatesUpdateInput,
    ...EcommerceEmailTemplateTransformer.select(),
  });
  return await EcommerceEmailTemplateTransformer.transform(updated);
}
