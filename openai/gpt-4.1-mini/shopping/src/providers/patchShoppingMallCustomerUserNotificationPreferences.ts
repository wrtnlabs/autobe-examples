import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserNotificationPreference";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotificationPreference";
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

export async function patchShoppingMallCustomerUserNotificationPreferences(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserNotificationPreference.IRequest;
}): Promise<IPageIShoppingMallUserNotificationPreference.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_user_notification_preferencesWhereInput = {
    ...(props.body.customer_id === null
      ? {}
      : { customer_id: props.body.customer_id }),
    ...(props.body.seller_id === null
      ? {}
      : { seller_id: props.body.seller_id }),
    ...(props.body.administrator_id === null
      ? {}
      : { administrator_id: props.body.administrator_id }),
    ...(props.body.channel_name === null
      ? {}
      : { channel_name: props.body.channel_name }),
    ...(props.body.notification_type === null
      ? {}
      : { notification_type: props.body.notification_type }),
  };
  const data =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        channel_name: true,
        notification_type: true,
        is_enabled: true,
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
        administrator: {
          select: {
            id: true,
            email: true,
            name: true,
            is_super_admin: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            administratorGrade: {
              select: {
                id: true,
                name: true,
                grade: true,
                super_administrator: true,
              },
            },
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.count({
      where,
    });
  const resultData = data.map((value) => {
    const customer =
      value.customer === null
        ? undefined
        : ({
            id: value.customer.id,
            email: value.customer.email,
            displayName: value.customer.display_name ?? null,
            phoneNumber: value.customer.phone_number ?? null,
            createdAt:
              typeof value.customer.created_at === "string"
                ? value.customer.created_at
                : (toISOStringSafe(value.customer.created_at) ?? ""),
            updatedAt:
              typeof value.customer.updated_at === "string"
                ? value.customer.updated_at
                : (toISOStringSafe(value.customer.updated_at) ?? ""),
          } satisfies IShoppingMallCustomer.ISummary | undefined);
    const seller =
      value.seller === null
        ? undefined
        : ({
            id: value.seller.id,
            email: value.seller.email,
            shopName: value.seller.shop_name,
            shopDescription: value.seller.shop_description ?? null,
            logoUri: value.seller.logo_uri ?? null,
            approvalStatus: value.seller.approval_status,
            rejectionReason: value.seller.rejection_reason ?? null,
          } satisfies IShoppingMallSeller.ISummary | undefined);
    const administrator =
      value.administrator === null
        ? undefined
        : ({
            id: value.administrator.id,
            email: value.administrator.email,
            name: value.administrator.name,
            isSuperAdmin: value.administrator.is_super_admin,
            createdAt:
              typeof value.administrator.created_at === "string"
                ? value.administrator.created_at
                : (toISOStringSafe(value.administrator.created_at) ?? ""),
            updatedAt:
              typeof value.administrator.updated_at === "string"
                ? value.administrator.updated_at
                : (toISOStringSafe(value.administrator.updated_at) ?? ""),
            deletedAt:
              value.administrator.deleted_at === null
                ? null
                : typeof value.administrator.deleted_at === "string"
                  ? value.administrator.deleted_at
                  : (toISOStringSafe(value.administrator.deleted_at) ?? ""),
            administratorGrade: {
              id: value.administrator.administratorGrade.id,
              name: value.administrator.administratorGrade.name,
              grade: value.administrator.administratorGrade.grade,
              superAdministrator:
                value.administrator.administratorGrade.super_administrator,
            } satisfies IShoppingMallAdministratorGrade.ISummary,
          } satisfies IShoppingMallAdministrator.ISummary | undefined);
    return {
      id: value.id,
      channelName: value.channel_name,
      notificationType: value.notification_type,
      isEnabled: value.is_enabled,
      customer,
      seller,
      administrator,
    } satisfies IShoppingMallUserNotificationPreference.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: resultData,
  } satisfies IPageIShoppingMallUserNotificationPreference.ISummary;
}
