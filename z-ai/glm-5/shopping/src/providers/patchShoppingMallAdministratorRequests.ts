import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdministratorSession";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorSession";
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

export async function patchShoppingMallAdministratorRequests(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallAdministratorSession.IRequest;
}): Promise<IPageIShoppingMallAdministratorSession.ISummary> {
  // Verify administrator exists and is super grade
  const admin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { grade: true },
    });
  if (admin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can view administrator sessions",
      403,
    );
  }
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  // Note: The IRequest.status filter exists in DTO but sessions table has no status column.
  const whereInput: Prisma.shopping_mall_administrator_sessionsWhereInput = {};
  // Query sessions with administrator relation
  const sessions =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        administrator_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        administrator: {
          select: {
            id: true,
            email: true,
            grade: true,
            created_at: true,
            updated_at: true,
          },
        },
      } satisfies Prisma.shopping_mall_administrator_sessionsSelect,
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.shopping_mall_administrator_sessions.count({
      where: whereInput,
    });
  // Transform results to DTO format
  const data: IShoppingMallAdministratorSession.ISummary[] = sessions.map(
    (session) =>
      ({
        id: session.id as string & tags.Format<"uuid">,
        administrator: {
          id: session.administrator.id as string & tags.Format<"uuid">,
          email: session.administrator.email as string & tags.Format<"email">,
          grade: session.administrator.grade as "regular" | "super",
          created_at: session.administrator.created_at.toISOString(),
          updated_at: session.administrator.updated_at.toISOString(),
        } satisfies IShoppingMallAdministrator.ISummary,
        ip: session.ip,
        href: session.href,
        referrer: session.referrer,
        created_at: session.created_at.toISOString(),
        expired_at: session.expired_at.toISOString(),
      }) satisfies IShoppingMallAdministratorSession.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIShoppingMallAdministratorSession.ISummary;
}
