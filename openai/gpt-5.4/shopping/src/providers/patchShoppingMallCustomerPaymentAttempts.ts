import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentAttempt";
import { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerPaymentAttempts(props: {
  customer: CustomerPayload;
  body: IShoppingMallPaymentAttempt.IRequest;
}): Promise<IPageIShoppingMallPaymentAttempt.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  if (
    props.body.minimumAmount !== undefined &&
    props.body.maximumAmount !== undefined &&
    props.body.minimumAmount > props.body.maximumAmount
  ) {
    throw new HttpException(
      "minimumAmount cannot be greater than maximumAmount",
      400,
    );
  }
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtTo !== undefined &&
    props.body.createdAtFrom > props.body.createdAtTo
  ) {
    throw new HttpException(
      "createdAtFrom cannot be later than createdAtTo",
      400,
    );
  }
  if (
    props.body.processedAtFrom !== undefined &&
    props.body.processedAtTo !== undefined &&
    props.body.processedAtFrom > props.body.processedAtTo
  ) {
    throw new HttpException(
      "processedAtFrom cannot be later than processedAtTo",
      400,
    );
  }
  const whereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.gatewayProvider !== undefined && {
      gateway_provider: props.body.gatewayProvider,
    }),
    ...((props.body.minimumAmount !== undefined ||
      props.body.maximumAmount !== undefined) && {
      amount: {
        ...(props.body.minimumAmount !== undefined && {
          gte: props.body.minimumAmount,
        }),
        ...(props.body.maximumAmount !== undefined && {
          lte: props.body.maximumAmount,
        }),
      },
    }),
    ...((props.body.createdAtFrom !== undefined ||
      props.body.createdAtTo !== undefined) && {
      created_at: {
        ...(props.body.createdAtFrom !== undefined && {
          gte: props.body.createdAtFrom,
        }),
        ...(props.body.createdAtTo !== undefined && {
          lte: props.body.createdAtTo,
        }),
      },
    }),
    ...((props.body.processedAtFrom !== undefined ||
      props.body.processedAtTo !== undefined) && {
      processed_at: {
        ...(props.body.processedAtFrom !== undefined && {
          gte: props.body.processedAtFrom,
        }),
        ...(props.body.processedAtTo !== undefined && {
          lte: props.body.processedAtTo,
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_payment_attemptsWhereInput;
  const orderByInput =
    props.body.sort === undefined || props.body.sort === "created_at_desc"
      ? ({
          created_at: "desc",
        } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
      : props.body.sort === "created_at_asc"
        ? ({
            created_at: "asc",
          } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
        : props.body.sort === "processed_at_desc"
          ? ({
              processed_at: "desc",
            } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
          : props.body.sort === "processed_at_asc"
            ? ({
                processed_at: "asc",
              } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
            : props.body.sort === "amount_desc"
              ? ({
                  amount: "desc",
                } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
              : props.body.sort === "amount_asc"
                ? ({
                    amount: "asc",
                  } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
                : props.body.sort === "status_asc"
                  ? ({
                      status: "asc",
                    } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
                  : props.body.sort === "status_desc"
                    ? ({
                        status: "desc",
                      } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
                    : props.body.sort === "gateway_provider_asc"
                      ? ({
                          gateway_provider: "asc",
                        } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
                      : props.body.sort === "gateway_provider_desc"
                        ? ({
                            gateway_provider: "desc",
                          } satisfies Prisma.shopping_mall_payment_attemptsOrderByWithRelationInput)
                        : null;
  if (orderByInput === null) {
    throw new HttpException("Invalid sort directive", 400);
  }
  const rows = await MyGlobal.prisma.shopping_mall_payment_attempts.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      status: true,
      amount: true,
      gateway_provider: true,
      gateway_reference: true,
      failure_reason: true,
      processed_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_payment_attempts.count({
    where: whereInput,
  });
  return {
    data: rows.map(
      (row) =>
        ({
          id: row.id,
          status: row.status,
          amount: row.amount,
          gateway_provider: row.gateway_provider,
          gateway_reference: row.gateway_reference,
          failure_reason: row.failure_reason,
          processed_at:
            row.processed_at !== null
              ? toISOStringSafe(row.processed_at)
              : null,
          created_at: toISOStringSafe(row.created_at),
          updated_at: toISOStringSafe(row.updated_at),
          deleted_at:
            row.deleted_at !== null ? toISOStringSafe(row.deleted_at) : null,
        }) satisfies IShoppingMallPaymentAttempt.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
