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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerUserNotificationPreferences(props: {
  seller: SellerPayload;
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
    customer_id:
      props.body.customer_id === undefined ? undefined : props.body.customer_id,
    seller_id: props.seller.id,
    administrator_id:
      props.body.administrator_id === undefined
        ? undefined
        : props.body.administrator_id,
    channel_name:
      props.body.channel_name === null || props.body.channel_name === undefined
        ? undefined
        : props.body.channel_name,
    notification_type:
      props.body.notification_type === null ||
      props.body.notification_type === undefined
        ? undefined
        : props.body.notification_type,
  };
  const dataRecords =
    await MyGlobal.prisma.shopping_mall_user_notification_preferences.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
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
  return {
    data: await ArrayUtil.asyncMap(dataRecords, async (record) => ({
      id: record.id,
      channelName: record.channel_name ?? "",
      notificationType: record.notification_type ?? "",
      isEnabled: record.is_enabled,
      customer: record.customer
        ? {
            id: record.customer.id,
            email: record.customer.email,
            displayName: record.customer.display_name,
            phoneNumber: record.customer.phone_number,
            createdAt: record.customer.created_at.toISOString() as string &
              tags.Format<"date-time">,
            updatedAt: record.customer.updated_at.toISOString() as string &
              tags.Format<"date-time">,
          }
        : null,
      seller: record.seller
        ? {
            id: record.seller.id,
            email: record.seller.email,
            shopName: record.seller.shop_name,
            shopDescription: record.seller.shop_description,
            logoUri: record.seller.logo_uri,
            approvalStatus: record.seller.approval_status,
            rejectionReason: record.seller.rejection_reason,
          }
        : null,
      administrator: record.administrator
        ? {
            id: record.administrator.id,
            email: record.administrator.email,
            name: record.administrator.name,
            isSuperAdmin: record.administrator.is_super_admin,
            createdAt: record.administrator.created_at.toISOString() as string &
              tags.Format<"date-time">,
            updatedAt: record.administrator.updated_at.toISOString() as string &
              tags.Format<"date-time">,
            deletedAt:
              record.administrator.deleted_at === null
                ? null
                : (record.administrator.deleted_at.toISOString() as string &
                    tags.Format<"date-time">),
            administratorGrade: record.administrator.administratorGrade
              ? {
                  id: record.administrator.administratorGrade.id,
                  name: record.administrator.administratorGrade.name,
                  grade: record.administrator.administratorGrade
                    .grade as number & tags.Type<"int32">,
                  superAdministrator:
                    record.administrator.administratorGrade.super_administrator,
                }
              : null,
          }
        : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
