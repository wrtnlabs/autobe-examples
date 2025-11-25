import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";
import { IPageIShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallExternalPaymentProvider";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminExternalPaymentProviders(props: {
  admin: AdminPayload;
  body: IShoppingMallExternalPaymentProvider.IRequest;
}): Promise<IPageIShoppingMallExternalPaymentProvider.ISummary> {
  // Default pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Construct the Prisma 'where' filter
  const stringMode = "insensitive" as Prisma.QueryMode;
  const where: Prisma.shopping_mall_external_payment_providersWhereInput = {
    deleted_at: null,
    ...(props.body.provider_name
      ? {
          provider_name: {
            contains: props.body.provider_name,
            mode: stringMode,
          },
        }
      : {}),
    ...(props.body.provider_code
      ? {
          provider_code: {
            contains: props.body.provider_code,
            mode: stringMode,
          },
        }
      : {}),
    ...(props.body.status ? { status: props.body.status } : {}),
    ...(props.body.q
      ? {
          OR: [
            { provider_name: { contains: props.body.q, mode: stringMode } },
            { provider_code: { contains: props.body.q, mode: stringMode } },
            { description: { contains: props.body.q, mode: stringMode } },
          ],
        }
      : {}),
  };

  // Query matched providers and total count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_external_payment_providers.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_external_payment_providers.count({ where }),
  ]);

  // Map rows to ISummary DTOs
  const data = rows.map((row) => ({
    id: row.id,
    name: row.provider_name,
    provider_code: row.provider_code,
    status: row.status,
    description: row.description,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    deleted_at:
      row.deleted_at === null || row.deleted_at === undefined
        ? undefined
        : toISOStringSafe(row.deleted_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
