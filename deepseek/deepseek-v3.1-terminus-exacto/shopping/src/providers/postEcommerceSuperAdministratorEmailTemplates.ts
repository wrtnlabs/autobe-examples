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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceEmailTemplateTransformer } from "../transformers/EcommerceEmailTemplateTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSuperAdministratorEmailTemplates(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceEmailTemplate.ICreate;
}): Promise<IEcommerceEmailTemplate> {
  // Step 1: Check for existing template with same code to enforce uniqueness
  const existing = await MyGlobal.prisma.ecommerce_email_templates.findFirst({
    where: {
      code: props.body.code,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Template with this code already exists", 409);
  }
  // Step 2: Create the email template using Collector for data transformation
  const created = await MyGlobal.prisma.ecommerce_email_templates.create({
    data: await EcommerceEmailTemplateCollector.collect({
      body: props.body,
    }),
    ...EcommerceEmailTemplateTransformer.select(),
  });
  // Step 3: Transform database record to API response using Transformer
  return await EcommerceEmailTemplateTransformer.transform(created);
}
