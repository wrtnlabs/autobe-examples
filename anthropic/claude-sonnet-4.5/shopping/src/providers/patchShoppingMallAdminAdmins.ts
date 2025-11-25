import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminAdmins(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IRequest;
}): Promise<IPageIShoppingMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";

  const buildWhereCondition = () => {
    const conditions: Record<string, unknown> = {};

    if (props.body.email) {
      conditions.email = { contains: props.body.email };
    }

    if (props.body.admin_level) {
      conditions.admin_level = props.body.admin_level;
    }

    if (props.body.status === "active") {
      conditions.deleted_at = null;
    } else if (props.body.status === "deleted") {
      conditions.deleted_at = { not: null };
    }

    if (props.body.created_after || props.body.created_before) {
      const createdAtCondition: Record<string, unknown> = {};
      if (props.body.created_after) {
        createdAtCondition.gte = new Date(props.body.created_after);
      }
      if (props.body.created_before) {
        createdAtCondition.lte = new Date(props.body.created_before);
      }
      conditions.created_at = createdAtCondition;
    }

    if (props.body.search) {
      conditions.OR = [
        { email: { contains: props.body.search } },
        { full_name: { contains: props.body.search } },
        { phone_number: { contains: props.body.search } },
      ];
    }

    return conditions;
  };

  const whereCondition = buildWhereCondition();

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_admins.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.shopping_mall_admins.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((admin) => ({
      id: admin.id,
      email: admin.email,
      full_name: admin.full_name,
      phone_number: admin.phone_number,
      admin_level: typia.assert<"super_admin" | "moderator" | "support">(
        admin.admin_level,
      ),
      email_verified: admin.email_verified,
      created_at: toISOStringSafe(admin.created_at),
      updated_at: toISOStringSafe(admin.updated_at),
      deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    })),
  };
}
