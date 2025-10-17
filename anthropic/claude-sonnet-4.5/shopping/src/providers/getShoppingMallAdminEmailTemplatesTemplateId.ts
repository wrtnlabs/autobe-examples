import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminEmailTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallEmailTemplate> {
  const { admin, templateId } = props;

  const template =
    await MyGlobal.prisma.shopping_mall_email_templates.findUniqueOrThrow({
      where: {
        id: templateId,
      },
      select: {
        id: true,
        template_code: true,
        template_name: true,
      },
    });

  return {
    id: template.id as string & tags.Format<"uuid">,
    template_code: template.template_code,
    template_name: template.template_name,
  };
}
