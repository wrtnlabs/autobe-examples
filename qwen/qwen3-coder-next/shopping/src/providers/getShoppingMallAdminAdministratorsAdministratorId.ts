import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallAdminTransformer } from "../transformers/ShoppingMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminAdministratorsAdministratorId(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdmin> {
  const admin = await MyGlobal.prisma.shopping_mall_admins.findUniqueOrThrow({
    where: { id: props.administratorId },
    select: {
      id: true,
      email: true,
      password_hash: true,
      role_grade: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      sessions: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_admin_sessionsFindManyArgs,
      passwordResets: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_admin_password_resetsFindManyArgs,
      migrations: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_system_migrationsFindManyArgs,
      cacheInvalidationLogs: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_system_cache_trackingsFindManyArgs,
      suspensionInitiateds: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_seller_suspensionsFindManyArgs,
      suspensionsApproveds: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_seller_suspensionsFindManyArgs,
      verifiedSellers: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_seller_verificationsFindManyArgs,
      processedExports: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_seller_exportsFindManyArgs,
      cancelledCancellationRequests: {
        select: { id: true },
      } satisfies Prisma.shopping_mall_order_cancellation_requestsFindManyArgs,
    },
  });
  return ShoppingMallAdminTransformer.transform(admin);
}
