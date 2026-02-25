import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleQuestionAnswer";
import { IShoppingMallSaleQuestionAnswer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestionAnswer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSalesSaleIdQuestionAnswers(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleQuestionAnswer.IRequest;
}): Promise<IPageIShoppingMallSaleQuestionAnswer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUniqueOrThrow({
    where: { id: props.saleId },
    select: { seller_id: true },
  });
  if (sale.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const questionIds =
    await MyGlobal.prisma.shopping_mall_sale_questions.findMany({
      where: { shopping_mall_sale_id: props.saleId },
      select: { id: true },
    });
  const questionIdList = questionIds.map((q) => q.id);
  const whereInput: Prisma.shopping_mall_sale_question_answersWhereInput = {
    deleted_at: null,
    seller_id: props.seller.id,
    shopping_mall_sale_question_id: {
      in: questionIdList,
    },
    ...(props.body.title ? { title: { contains: props.body.title } } : {}),
    ...(props.body.body ? { body: { contains: props.body.body } } : {}),
    ...(props.body.sellerId ? { seller_id: props.body.sellerId } : {}),
    ...(props.body.createdAtFrom
      ? { created_at: { gte: props.body.createdAtFrom } }
      : {}),
    ...(props.body.createdAtTo
      ? { created_at: { lte: props.body.createdAtTo } }
      : {}),
    ...(props.body.updatedAtFrom
      ? { updated_at: { gte: props.body.updatedAtFrom } }
      : {}),
    ...(props.body.updatedAtTo
      ? { updated_at: { lte: props.body.updatedAtTo } }
      : {}),
  };
  const data =
    await MyGlobal.prisma.shopping_mall_sale_question_answers.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        body: true,
        shopping_mall_sale_question_id: true,
        seller: {
          select: {
            id: true,
            email: true,
            shop_name: true,
            shop_description: true,
            logo_uri: true,
            approval_status: true,
            rejection_reason: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const total = await MyGlobal.prisma.shopping_mall_sale_question_answers.count(
    { where: whereInput },
  );
  return {
    data: data.map((answer) => ({
      id: answer.id,
      title: answer.title,
      body: answer.body,
      shoppingMallSaleQuestionId: answer.shopping_mall_sale_question_id,
      seller: {
        id: answer.seller.id,
        email: answer.seller.email,
        shopName: answer.seller.shop_name,
        shopDescription: answer.seller.shop_description ?? null,
        logoUri: answer.seller.logo_uri ?? null,
        approvalStatus: answer.seller.approval_status,
        rejectionReason: answer.seller.rejection_reason ?? null,
      },
      createdAt: toISOStringSafe(answer.created_at),
      updatedAt: toISOStringSafe(answer.updated_at),
      deletedAt: answer.deleted_at ? toISOStringSafe(answer.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
