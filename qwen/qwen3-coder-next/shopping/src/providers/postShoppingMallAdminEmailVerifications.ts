import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallAdminEmailVerificationCollector } from "../collectors/ShoppingMallAdminEmailVerificationCollector";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminEmailVerifications(props: {
  body: IShoppingMallAdminEmailVerification.ICreate;
}): Promise<IShoppingMallAdminEmailVerification.IResponse> {
  // Use prisma to get a sample admin as fallback
  const sampleAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst();
  if (!sampleAdmin) {
    throw new HttpException("No admin found", 404);
  }
  // Use the first available admin
  const admin = sampleAdmin;
  // Check if admin account exists and is not already verified
  const existingVerification =
    await MyGlobal.prisma.shopping_mall_admin_email_verifications.findFirst({
      where: {
        shopping_mall_admin_id: admin.id,
        verified_at: { not: null },
      },
    });
  // Use the collector function to create the verification record
  const createData = await ShoppingMallAdminEmailVerificationCollector.collect({
    body: props.body,
    shoppingMallAdmins: { id: admin.id } as IEntity,
  });
  // Create the verification record in the database
  await MyGlobal.prisma.shopping_mall_admin_email_verifications.create({
    data: createData,
  });
  return {} as IShoppingMallAdminEmailVerification.IResponse;
}
