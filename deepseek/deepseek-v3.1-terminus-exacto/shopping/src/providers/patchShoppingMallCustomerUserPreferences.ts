import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserPreference";
import { IPageIShoppingMallUserPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallUserPreference";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerUserPreferences(props: {
  customer: CustomerPayload;
  body: IShoppingMallUserPreference.IRequest;
}): Promise<IPageIShoppingMallUserPreference.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition with proper date range handling
  const whereCondition: Prisma.shopping_mall_user_preferencesWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
  };

  // Add search filters
  if (props.body.search) {
    whereCondition.OR = [
      { preference_type: { contains: props.body.search } },
      { preference_key: { contains: props.body.search } },
      { preference_value: { contains: props.body.search } },
    ];
  }

  // Add individual filters
  if (props.body.preference_type)
    whereCondition.preference_type = props.body.preference_type;
  if (props.body.preference_key)
    whereCondition.preference_key = props.body.preference_key;
  if (props.body.preference_value)
    whereCondition.preference_value = props.body.preference_value;
  if (props.body.category) whereCondition.category = props.body.category;
  if (props.body.is_active !== undefined)
    whereCondition.is_active = props.body.is_active;

  // Handle date ranges with proper null/undefined handling
  if (props.body.created_at_start || props.body.created_at_end) {
    whereCondition.created_at = {};
    if (props.body.created_at_start)
      whereCondition.created_at.gte = props.body.created_at_start;
    if (props.body.created_at_end)
      whereCondition.created_at.lte = props.body.created_at_end;
  }

  if (props.body.updated_at_start || props.body.updated_at_end) {
    whereCondition.updated_at = {};
    if (props.body.updated_at_start)
      whereCondition.updated_at.gte = props.body.updated_at_start;
    if (props.body.updated_at_end)
      whereCondition.updated_at.lte = props.body.updated_at_end;
  }

  // Build orderBy with proper fallback
  const orderBy: Prisma.shopping_mall_user_preferencesOrderByWithRelationInput =
    {};
  if (props.body.order_by) {
    const direction = props.body.order_direction === "desc" ? "desc" : "asc";
    orderBy[props.body.order_by] = direction;
  } else {
    orderBy.created_at = "desc";
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_user_preferences.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_user_preferences.count({
      where: whereCondition,
    }),
  ]);

  const formattedData = data.map((preference) => ({
    id: preference.id,
    preference_type: preference.preference_type,
    preference_key: preference.preference_key,
    preference_value: preference.preference_value,
    is_active: preference.is_active,
    customer: {
      id: preference.customer.id,
      email: preference.customer.email,
      first_name: preference.customer.first_name,
      last_name: preference.customer.last_name,
      phone_number: preference.customer.phone_number ?? undefined,
      status: preference.customer.status,
      created_at: toISOStringSafe(preference.customer.created_at),
      updated_at: preference.customer.updated_at
        ? toISOStringSafe(preference.customer.updated_at)
        : undefined,
    },
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: formattedData,
  };
}
