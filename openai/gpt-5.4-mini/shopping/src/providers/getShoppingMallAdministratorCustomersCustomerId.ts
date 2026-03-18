import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

export async function getShoppingMallAdministratorCustomersCustomerId(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomer> {
  const customer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customerId },
      select: {
        id: true,
        email: true,
        account_status: true,
        banned_at: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
        profile: {
          select: {
            id: true,
            display_name: true,
            phone_number: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  return {
    id: customer.id,
    email: customer.email,
    accountStatus: customer.account_status,
    bannedAt: customer.banned_at ? toISOStringSafe(customer.banned_at) : null,
    deletedAt: customer.deleted_at
      ? toISOStringSafe(customer.deleted_at)
      : null,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
    profile: customer.profile
      ? ({
          id: customer.profile.id,
          customer: {
            id: customer.id,
            email: customer.email,
            accountStatus: customer.account_status,
            bannedAt: customer.banned_at
              ? toISOStringSafe(customer.banned_at)
              : null,
            deletedAt: customer.deleted_at
              ? toISOStringSafe(customer.deleted_at)
              : null,
            createdAt: toISOStringSafe(customer.created_at),
            updatedAt: toISOStringSafe(customer.updated_at),
          } satisfies IShoppingMallCustomer.ISummary,
          displayName: customer.profile.display_name,
          phoneNumber: customer.profile.phone_number,
          createdAt: toISOStringSafe(customer.profile.created_at),
          updatedAt: toISOStringSafe(customer.profile.updated_at),
          deletedAt: customer.profile.deleted_at
            ? toISOStringSafe(customer.profile.deleted_at)
            : null,
        } satisfies IShoppingMallCustomerProfile)
      : null,
  } satisfies IShoppingMallCustomer;
}
