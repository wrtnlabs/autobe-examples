import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestion";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSaleQuestions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleQuestion.IRequest & any;
}): Promise<IPageIShoppingMallSaleQuestion.ISummary> {
  const body = props.body as any;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_questionsWhereInput = {
    deleted_at: null,
    ...(typeof body.shopping_mall_sale_id === "string"
      ? { shopping_mall_sale_id: body.shopping_mall_sale_id }
      : {}),
    ...(typeof body.shopping_mall_customer_id === "string"
      ? { shopping_mall_customer_id: body.shopping_mall_customer_id }
      : {}),
    ...(typeof body.status === "string" ? { status: body.status } : {}),
    ...(typeof body.search === "string" && body.search.length > 0
      ? {
          OR: [
            { title: { contains: body.search, mode: "insensitive" } },
            { body: { contains: body.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy =
    body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : body.sort === "updated_at_desc"
        ? { updated_at: "desc" as const }
        : body.sort === "status_asc"
          ? { status: "asc" as const }
          : { created_at: "desc" as const };
  const data = await MyGlobal.prisma.shopping_mall_sale_questions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      title: true,
      body: true,
      status: true,
      shopping_mall_sale_id: true,
      shopping_mall_customer_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_questions.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      title: record.title,
      body: record.body === null ? undefined : record.body,
      status: record.status,
      sale_id: record.shopping_mall_sale_id,
      customer_id: record.shopping_mall_customer_id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    })),
  };
}
