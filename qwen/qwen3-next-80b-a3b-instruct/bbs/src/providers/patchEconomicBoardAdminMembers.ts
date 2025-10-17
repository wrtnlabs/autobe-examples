import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardMember";
import { IPageIEconomicBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchEconomicBoardAdminMembers(props: {
  admin: AdminPayload;
  body: IEconomicBoardMember.IRequest;
}): Promise<IPageIEconomicBoardMember> {
  const { body } = props;

  // Calculate pagination values
  const page = body.page ?? 1;
  const limit = body.limit ?? 25;
  const skip = (page - 1) * limit;

  // Build where condition with conditional inclusion
  const where: Record<string, any> = {};

  if (body.search) {
    where.email = { contains: body.search };
  }

  if (body.isActive !== undefined) {
    where.is_active = body.isActive;
  }

  // Build orderBy inline with spread for better type inference
  const orderBy = {
    ...(body.sortBy && {
      [body.sortBy]: body.order === "asc" ? "asc" : "desc",
    }),
    ...(body.sortBy ? {} : { created_at: "desc" }),
  };

  // Query database
  const [members, total] = await Promise.all([
    MyGlobal.prisma.economic_board_member.findMany({
      where,
      orderBy: (body.sortBy
        ? { [body.sortBy]: body.order === "asc" ? "asc" : "desc" }
        : { created_at: "desc" }) as any,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        created_at: true,
        verified_at: true,
        last_login: true,
        is_active: true,
        auth_jwt_id: true, // Added missing auth_jwt_id to select
      },
    }),
    MyGlobal.prisma.economic_board_member.count({ where }),
  ]);

  // Convert Date fields to ISO strings in response
  const data: IEconomicBoardMember[] = members.map((member) => ({
    id: member.id,
    email: member.email,
    created_at: toISOStringSafe(member.created_at),
    verified_at: member.verified_at
      ? toISOStringSafe(member.verified_at)
      : undefined,
    last_login: toISOStringSafe(member.last_login),
    is_active: member.is_active,
    auth_jwt_id: member.auth_jwt_id,
  }));

  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
