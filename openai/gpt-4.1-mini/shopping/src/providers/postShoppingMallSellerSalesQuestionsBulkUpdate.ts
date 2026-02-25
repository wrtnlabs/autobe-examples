import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleQuestion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleQuestion";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSaleQuestionAtSummaryTransformer } from "../transformers/ShoppingMallSaleQuestionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallSellerSalesQuestionsBulkUpdate(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleQuestion.IBulkUpdate;
}): Promise<IShoppingMallSaleQuestion.ISummary[]> {
  if (!props.body.updates || props.body.updates.length === 0) {
    throw new HttpException("No updates provided", 400);
  }
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const updatedQuestions: IShoppingMallSaleQuestion.ISummary[] = [];
    for (const updateEntry of props.body.updates) {
      // Assert presence of id property
      const id = (
        updateEntry as {
          id?: string;
        }
      ).id;
      if (!id) {
        throw new HttpException("Each update entry must have an id", 400);
      }
      const existingQuestion = await tx.shopping_mall_sale_questions.findUnique(
        {
          where: { id },
          select: {
            id: true,
            title: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            sale: {
              select: {
                id: true,
                seller_id: true,
                name: true,
                base_price: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
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
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
              },
            },
            customer: {
              select: {
                id: true,
                email: true,
                display_name: true,
                phone_number: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      );
      if (!existingQuestion) {
        throw new HttpException(`SaleQuestion with id ${id} not found`, 404);
      }
      if (existingQuestion.sale.seller_id !== props.seller.id) {
        throw new HttpException(
          "Forbidden: Cannot update questions for sales not owned by seller",
          403,
        );
      }
      const dataToUpdate: Partial<Prisma.shopping_mall_sale_questionsUpdateInput> =
        {};
      if (
        (
          updateEntry as {
            status?: string;
          }
        ).status !== undefined
      ) {
        dataToUpdate.status = (
          updateEntry as {
            status?: string;
          }
        ).status;
      }
      if (
        (
          updateEntry as {
            title?: string;
          }
        ).title !== undefined
      ) {
        dataToUpdate.title = (
          updateEntry as {
            title?: string;
          }
        ).title;
      }
      if (
        (
          updateEntry as {
            body?: string;
          }
        ).body !== undefined
      ) {
        dataToUpdate.body = (
          updateEntry as {
            body?: string;
          }
        ).body;
      }
      // Convert updated_at using toISOStringSafe if it is Date or string
      const rawUpdatedAt = (
        updateEntry as {
          updated_at?: string | Date;
        }
      ).updated_at;
      dataToUpdate.updated_at =
        rawUpdatedAt === undefined || rawUpdatedAt === null
          ? toISOStringSafe(new Date())
          : typeof rawUpdatedAt === "string"
            ? rawUpdatedAt
            : toISOStringSafe(rawUpdatedAt);
      const updated = await tx.shopping_mall_sale_questions.update({
        where: { id },
        data: dataToUpdate,
        ...ShoppingMallSaleQuestionAtSummaryTransformer.select(),
      });
      const result =
        await ShoppingMallSaleQuestionAtSummaryTransformer.transform(updated);
      updatedQuestions.push(result);
    }
    return updatedQuestions;
  });
}
