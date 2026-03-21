import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IErpHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmGuestSessionTransformer } from "../transformers/ErpHrmGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminGuestSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IErpHrmGuestSession> {
  const session =
    await MyGlobal.prisma.erp_hrm_guest_sessions.findUniqueOrThrow({
      where: {
        id: props.sessionId,
        expired_at: {
          gt: new Date(),
        },
      },
      ...ErpHrmGuestSessionTransformer.select(),
    });
  return await ErpHrmGuestSessionTransformer.transform(session);
}
