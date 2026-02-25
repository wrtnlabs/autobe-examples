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

export async function getEcommerceSuperAdministratorEmailTemplatesTemplateId(props: {
  superAdministrator: SuperadministratorPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<IEcommerceEmailTemplate> {
  // Authorization handled via SuperadministratorAuth decorator
  // superAdministrator payload is guaranteed valid via that decorator
  const template =
    await MyGlobal.prisma.ecommerce_email_templates.findFirstOrThrow({
      where: {
        id: props.templateId,
        deleted_at: null,
      } satisfies Prisma.ecommerce_email_templatesWhereInput,
      ...EcommerceEmailTemplateTransformer.select(),
    });
  return await EcommerceEmailTemplateTransformer.transform(template);
}
