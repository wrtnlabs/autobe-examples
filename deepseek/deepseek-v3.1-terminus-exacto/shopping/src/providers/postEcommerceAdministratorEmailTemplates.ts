import { IEcommerceEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceEmailTemplate";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceEmailTemplateCollector } from "../collectors/EcommerceEmailTemplateCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceEmailTemplateTransformer } from "../transformers/EcommerceEmailTemplateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorEmailTemplates(props: {
  administrator: AdministratorPayload;
  body: IEcommerceEmailTemplate.ICreate;
}): Promise<IEcommerceEmailTemplate> {
  // Check code uniqueness
  const existing = await MyGlobal.prisma.ecommerce_email_templates.findFirst({
    where: { code: props.body.code, deleted_at: null },
  });
  if (existing) {
    throw new HttpException(
      `Email template with code '${props.body.code}' already exists`,
      400,
    );
  }
  // Create template using collector and transformer
  const template = await MyGlobal.prisma.ecommerce_email_templates.create({
    data: await EcommerceEmailTemplateCollector.collect({ body: props.body }),
    ...EcommerceEmailTemplateTransformer.select(),
  });
  return await EcommerceEmailTemplateTransformer.transform(template);
}
