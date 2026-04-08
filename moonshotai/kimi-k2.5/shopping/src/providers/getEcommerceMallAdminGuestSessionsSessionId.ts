import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallGuestSessionTransformer } from "../transformers/EcommerceMallGuestSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminGuestSessionsSessionId(props: {
  admin: AdminPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallGuestSession> {
  const session =
    await MyGlobal.prisma.ecommerce_mall_guest_sessions.findUniqueOrThrow({
      where: { id: props.sessionId },
      ...EcommerceMallGuestSessionTransformer.select(),
    });
  return await EcommerceMallGuestSessionTransformer.transform(session);
}
