import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallExternalPaymentProvider } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallExternalPaymentProvider";

export async function getShoppingMallExternalPaymentProvidersProviderCode(props: {
  providerCode: string;
}): Promise<IShoppingMallExternalPaymentProvider> {
  const provider =
    await MyGlobal.prisma.shopping_mall_external_payment_providers.findUnique({
      where: { provider_code: props.providerCode },
    });

  if (
    !provider ||
    provider.deleted_at !== null ||
    provider.status !== "active"
  ) {
    throw new HttpException("External payment provider not found", 404);
  }

  return {
    id: provider.id,
    provider_name: provider.provider_name,
    provider_code: provider.provider_code,
    status: provider.status,
    description: provider.description,
    created_at: toISOStringSafe(provider.created_at),
    updated_at: toISOStringSafe(provider.updated_at),
    deleted_at:
      provider.deleted_at === null
        ? undefined
        : toISOStringSafe(provider.deleted_at),
  };
}
