import { IEconomicBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardAdministratorSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicBoardCitizenSessions(props: {
  citizen: CitizenPayload;
  body: IEconomicBoardAdministratorSession.IRequest;
}): Promise<IPageIEconomicBoardAdministratorSession.ISummary> {
  const page = 1;
  const limit = 50;
  const skip = (page - 1) * limit;
  // Validate limit is between 1 and 50
  if (limit < 1 || limit > 50) {
    throw new HttpException("Limit must be between 1 and 50", 400);
  }
  // Build conditions for filtering
  const whereConditions: Prisma.economic_board_citizen_sessionsWhereInput &
    Prisma.economic_board_administrator_sessionsWhereInput &
    Prisma.economic_board_super_administrator_sessionsWhereInput = {};
  // No filtering properties from IRequest since they are not part of the interface
  // Define the UNION query structure
  // Since Prisma doesn't support UNION natively, we need to perform separate queries
  // and merge results manually
  // Query citizen sessions
  const citizenSessions =
    await MyGlobal.prisma.economic_board_citizen_sessions.findMany({
      where: {
        ...whereConditions,
        expired_at: { gt: toISOStringSafe(new Date()) }, // Exclude expired sessions
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  // Query administrator sessions
  const adminSessions =
    await MyGlobal.prisma.economic_board_administrator_sessions.findMany({
      where: {
        ...whereConditions,
        expired_at: { gt: toISOStringSafe(new Date()) }, // Exclude expired sessions
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  // Query super administrator sessions
  const superAdminSessions =
    await MyGlobal.prisma.economic_board_super_administrator_sessions.findMany({
      where: {
        ...whereConditions,
        expired_at: { gt: toISOStringSafe(new Date()) }, // Exclude expired sessions
      },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    });
  // Flatten results and normalize to unified format
  const unifiedResults = [
    ...citizenSessions.map((session) => ({
      id: session.id,
      user_id: session.economic_board_citizen_id,
      user_type: "citizen" as const,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
    })),
    ...adminSessions.map((session) => ({
      id: session.id,
      user_id: session.administrator_id,
      user_type: "administrator" as const,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
    })),
    ...superAdminSessions.map((session) => ({
      id: session.id,
      user_id: session.super_administrator_id,
      user_type: "super_administrator" as const,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
    })),
  ];
  // Sort all results by created_at DESC (after combining)
  unifiedResults.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  // Apply pagination after sorting all results
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedResults = unifiedResults.slice(startIndex, endIndex);
  // Get total count of non-expired sessions (union of all three tables)
  const totalCitizenSessions =
    await MyGlobal.prisma.economic_board_citizen_sessions.count({
      where: { expired_at: { gt: toISOStringSafe(new Date()) } },
    });
  const totalAdminSessions =
    await MyGlobal.prisma.economic_board_administrator_sessions.count({
      where: { expired_at: { gt: toISOStringSafe(new Date()) } },
    });
  const totalSuperAdminSessions =
    await MyGlobal.prisma.economic_board_super_administrator_sessions.count({
      where: { expired_at: { gt: toISOStringSafe(new Date()) } },
    });
  const total =
    totalCitizenSessions + totalAdminSessions + totalSuperAdminSessions;
  // Calculate total pages
  const pages = Math.ceil(total / limit);
  return {
    data: paginatedResults as IEconomicBoardAdministratorSession.ISummary[],
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
  };
}
