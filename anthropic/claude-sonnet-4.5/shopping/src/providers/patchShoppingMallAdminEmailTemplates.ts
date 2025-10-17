import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEmailTemplate";
import { IPageIShoppingMallEmailTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallEmailTemplate";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminEmailTemplates(props: {
  admin: AdminPayload;
  body: IShoppingMallEmailTemplate.IRequest;
}): Promise<IPageIShoppingMallEmailTemplate.ISummary> {
  const { body } = props;

  const page = Number(body.page ?? 0);
  const limit = 20;
  const skip = page * limit;

  const [templates, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_email_templates.findMany({
      select: {
        id: true,
        template_name: true,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_email_templates.count(),
  ]);

  const data = templates.map((template) => ({
    id: template.id,
    template_name: template.template_name,
  }));

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(pages),
    },
    data: data,
  };
}
