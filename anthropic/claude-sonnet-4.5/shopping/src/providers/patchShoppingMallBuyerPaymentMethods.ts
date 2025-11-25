import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchShoppingMallBuyerPaymentMethods(props: {
  buyer: BuyerPayload;
  body: IShoppingMallPaymentMethod.IRequest;
}): Promise<IPageIShoppingMallPaymentMethod.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    shopping_mall_buyer_id: props.buyer.id,
    deleted_at: null,
    ...(props.body.payment_type && {
      payment_type: props.body.payment_type,
    }),
    ...(props.body.card_brand && {
      card_brand: {
        contains: props.body.card_brand,
      },
    }),
    ...(props.body.last_four_digits && {
      last_four_digits: {
        contains: props.body.last_four_digits,
      },
    }),
    ...(props.body.is_default !== null &&
      props.body.is_default !== undefined && {
        is_default: props.body.is_default,
      }),
    ...(props.body.is_verified !== null &&
      props.body.is_verified !== undefined && {
        is_verified: props.body.is_verified,
      }),
    ...(() => {
      if (!props.body.created_at_from && !props.body.created_at_to) return {};
      return {
        created_at: {
          ...(props.body.created_at_from && {
            gte: new Date(props.body.created_at_from),
          }),
          ...(props.body.created_at_to && {
            lte: new Date(props.body.created_at_to),
          }),
        },
      };
    })(),
  };

  const sortByMapping: Record<string, string> = {
    created_at: "created_at",
    payment_type: "payment_type",
    is_default: "is_default",
    billing_name: "billing_name",
  };

  const sortField = props.body.sort_by
    ? sortByMapping[props.body.sort_by]
    : "created_at";
  const sortOrder = props.body.order ?? "desc";

  const orderBy = {
    [sortField]: sortOrder,
  };

  const [allData, totalBeforeActiveFilter] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_methods.findMany({
      where: whereCondition,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_payment_methods.count({
      where: whereCondition,
    }),
  ]);

  let filteredData = allData;

  if (props.body.is_active !== null && props.body.is_active !== undefined) {
    filteredData = allData.filter((pm) => {
      const isVerified = pm.is_verified;
      let isNotExpired = true;

      if (pm.expiry_year !== null && pm.expiry_month !== null) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        if (pm.expiry_year < currentYear) {
          isNotExpired = false;
        } else if (
          pm.expiry_year === currentYear &&
          pm.expiry_month < currentMonth
        ) {
          isNotExpired = false;
        }
      }

      const isActive = isVerified && isNotExpired;
      return isActive === props.body.is_active;
    });
  }

  const total = filteredData.length;
  const paginatedData = filteredData.slice(skip, skip + limit);

  const mappedData: IShoppingMallPaymentMethod.ISummary[] = paginatedData.map(
    (pm) => {
      const paymentType = typia.assert<
        | "credit_card"
        | "debit_card"
        | "paypal"
        | "apple_pay"
        | "google_pay"
        | "bank_transfer"
      >(pm.payment_type);

      return {
        id: pm.id,
        payment_type: paymentType,
        provider: pm.provider,
        last_four_digits: pm.last_four_digits ?? undefined,
        card_brand: pm.card_brand ?? undefined,
        billing_name: pm.billing_name,
        billing_postal_code: pm.billing_postal_code ?? undefined,
        expiry_month: pm.expiry_month ?? undefined,
        expiry_year: pm.expiry_year ?? undefined,
        is_default: pm.is_default,
        is_verified: pm.is_verified,
        created_at: toISOStringSafe(pm.created_at),
        updated_at: toISOStringSafe(pm.updated_at),
      };
    },
  );

  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
    data: mappedData,
  };
}
