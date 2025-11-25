import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationPreference";
import { IPageIShoppingMallNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationPreference";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerNotificationsPreferences(props: {
  customer: CustomerPayload;
  body: IShoppingMallNotificationPreference.IRequest;
}): Promise<IPageIShoppingMallNotificationPreference> {
  // Pagination parameters are provided via query string (not in body) with default values
  const page: number = 1;
  const limit: number = 100;
  const skip: number = (page - 1) * limit;

  // Build where condition with all filters
  const where: Prisma.shopping_mall_notification_preferencesWhereInput = {
    actor_id: props.customer.id,
    deleted_at: null,
  };

  // Add filters from IRequest properties
  if (props.body.notification_type !== undefined) {
    where.notification_type = props.body.notification_type;
  }

  if (props.body.email_enabled !== undefined) {
    where.email_enabled = props.body.email_enabled;
  }

  if (props.body.in_app_enabled !== undefined) {
    where.in_app_enabled = props.body.in_app_enabled;
  }

  if (props.body.push_enabled !== undefined) {
    where.push_enabled = props.body.push_enabled;
  }

  // Parse created_at_range for gte/lte
  if (props.body.created_at_range) {
    const [start, end] = props.body.created_at_range.split("/");
    if (start) {
      if (!where.created_at) where.created_at = {};
      (where.created_at as any).gte = start;
    }
    if (end) {
      if (!where.created_at) where.created_at = {};
      (where.created_at as any).lte = end;
    }
  }

  // Parse updated_at_range for gte/lte
  if (props.body.updated_at_range) {
    const [start, end] = props.body.updated_at_range.split("/");
    if (start) {
      if (!where.updated_at) where.updated_at = {};
      (where.updated_at as any).gte = start;
    }
    if (end) {
      if (!where.updated_at) where.updated_at = {};
      (where.updated_at as any).lte = end;
    }
  }

  // Add text search on notification_type
  if (props.body.text_search) {
    where.notification_type = {
      contains: props.body.text_search,
      mode: "insensitive",
    };
  }

  // Order by created_at descending by default
  const orderBy: Prisma.shopping_mall_notification_preferencesOrderByWithRelationInput =
    {
      created_at: "desc",
    };

  // Get total count matching criteria
  const total =
    await MyGlobal.prisma.shopping_mall_notification_preferences.count({
      where,
    });

  // Get paginated data
  const preferences =
    await MyGlobal.prisma.shopping_mall_notification_preferences.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

  // Convert to response format with safe date strings
  const data: string[] = preferences.map((pref) => pref.notification_type);

  // Ensure data matches the expected structure of IPageIShoppingMallNotificationPreference
  const response: IPageIShoppingMallNotificationPreference = {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };

  return response;
}
