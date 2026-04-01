import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformSellerAccountTransformer } from "../transformers/MallPlatformSellerAccountTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformCustomerAccountsAccountId(props: {
  customer: CustomerPayload;
  accountId: string & tags.Format<"uuid">;
  body: IMallPlatformSellerAccount.IUpdate;
}): Promise<IMallPlatformSellerAccount> {
  const account =
    await MyGlobal.prisma.mall_platform_seller_accounts.findUniqueOrThrow({
      where: {
        id: props.accountId,
      },
      select: {
        id: true,
        email: true,
        approval_status: true,
        rejection_reason: true,
        suspended_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
    });
  if (account.id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.mall_platform_seller_accounts.update({
    where: {
      id: props.accountId,
    },
    data: {
      ...(props.body.approvalStatus !== undefined && {
        approval_status: props.body.approvalStatus,
      }),
      ...(props.body.rejectionReason !== undefined && {
        rejection_reason: props.body.rejectionReason,
      }),
      ...(props.body.suspendedAt !== undefined && {
        suspended_at: props.body.suspendedAt,
      }),
      ...(props.body.deletedAt !== undefined && {
        deleted_at: props.body.deletedAt,
      }),
    },
    ...MallPlatformSellerAccountTransformer.select(),
  });
  return await MallPlatformSellerAccountTransformer.transform(updated);
}
