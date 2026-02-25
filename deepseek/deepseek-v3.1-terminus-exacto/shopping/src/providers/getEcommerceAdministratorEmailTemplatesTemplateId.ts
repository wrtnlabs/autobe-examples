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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getEcommerceAdministratorEmailTemplatesTemplateId(props: {
  administrator: AdministratorPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<IEcommerceEmailTemplate> {
  const template =
    await MyGlobal.prisma.ecommerce_email_templates.findUniqueOrThrow({
      where: { id: props.templateId },
      ...EcommerceEmailTemplateTransformer.select(),
    });
  return await EcommerceEmailTemplateTransformer.transform(template);
}
