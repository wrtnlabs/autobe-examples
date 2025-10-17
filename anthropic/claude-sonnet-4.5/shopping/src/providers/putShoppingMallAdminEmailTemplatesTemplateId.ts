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

export async function putShoppingMallAdminEmailTemplatesTemplateId(props: {
  admin: AdminPayload;
  templateId: string & tags.Format<"uuid">;
  body: IShoppingMallEmailTemplate.IUpdate;
}): Promise<IShoppingMallEmailTemplate> {
  const { admin, templateId, body } = props;

  await MyGlobal.prisma.shopping_mall_email_templates.findUniqueOrThrow({
    where: { id: templateId },
  });

  const updated = await MyGlobal.prisma.shopping_mall_email_templates.update({
    where: { id: templateId },
    data: {
      template_name: body.template_name ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    template_code: updated.template_code,
    template_name: updated.template_name,
  };
}
