import { IEconomicBoardAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministratorSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEconomicBoardCitizenSessionsSessionId(props: {
  citizen: CitizenPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardAdministratorSession> {
  const session =
    await MyGlobal.prisma.economic_board_citizen_sessions.findUnique({
      where: { id: props.sessionId },
      select: {
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  return {
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: toISOStringSafe(session.expired_at),
  } satisfies IEconomicBoardAdministratorSession;
}
