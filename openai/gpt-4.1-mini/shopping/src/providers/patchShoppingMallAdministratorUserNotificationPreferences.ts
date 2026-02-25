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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorUserNotificationPreferences(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallUserNotificationPreference.IRequest;
}): Promise<IPageIShoppingMallUserNotificationPreference.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 10;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_user_notification_preferencesWhereInput = {
    deleted_at: null,
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
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_notification_preferences.findMany({
      where,
      skip,
      take: limit,
      orderBy: { channel_name: "asc" },
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
    }),
    MyGlobal.prisma.shopping_mall_user_notification_preferences.count({
      where,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => {
      const id: string & tags.Format<"uuid"> = record.id;
      const channelName: string = record.channel_name;
      const notificationType: string = record.notification_type;
      const isEnabled: boolean = record.is_enabled;
      const customer = record.customer
        ? ({
            id: record.customer.id,
            email: record.customer.email,
            displayName: record.customer.display_name ?? null,
            phoneNumber: record.customer.phone_number ?? null,
            createdAt: toISOStringSafe(record.customer.created_at) as string &
              tags.Format<"date-time">,
            updatedAt: toISOStringSafe(record.customer.updated_at) as string &
              tags.Format<"date-time">,
          } satisfies IShoppingMallCustomer.ISummary)
        : null;
      const seller = record.seller
        ? ({
            id: record.seller.id,
            email: record.seller.email,
            shopName: record.seller.shop_name,
            shopDescription: record.seller.shop_description ?? null,
            logoUri: record.seller.logo_uri ?? null,
            approvalStatus: record.seller.approval_status,
            rejectionReason: record.seller.rejection_reason ?? null,
          } satisfies IShoppingMallSeller.ISummary)
        : null;
      const administrator = record.administrator
        ? ({
            id: record.administrator.id,
            email: record.administrator.email,
            name: record.administrator.name,
            isSuperAdmin: record.administrator.is_super_admin,
            createdAt: toISOStringSafe(
              record.administrator.created_at,
            ) as string & tags.Format<"date-time">,
            updatedAt: toISOStringSafe(
              record.administrator.updated_at,
            ) as string & tags.Format<"date-time">,
            deletedAt: record.administrator.deleted_at
              ? toISOStringSafe(record.administrator.deleted_at)
              : null,
            administratorGrade: {
              id: record.administrator.administratorGrade.id,
              name: record.administrator.administratorGrade.name,
              grade: record.administrator.administratorGrade.grade,
              superAdministrator:
                record.administrator.administratorGrade.super_administrator,
            } satisfies IShoppingMallAdministratorGrade.ISummary,
          } satisfies IShoppingMallAdministrator.ISummary)
        : null;
      return {
        id,
        channelName,
        notificationType,
        isEnabled,
        customer,
        seller,
        administrator,
      };
    }),
  };
}
