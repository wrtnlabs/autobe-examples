import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { IHrmTimeTrackingOwnerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwnerSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingOwnerSessionTransformer } from "../transformers/HrmTimeTrackingOwnerSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingOwnerSessionsSessionId(props: {
  owner: OwnerPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingOwnerSession> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_owner_sessions.findFirstOrThrow({
      where: {
        id: props.sessionId,
        hrm_time_tracking_owner_id: props.owner.id,
      },
      ...HrmTimeTrackingOwnerSessionTransformer.select(),
    });
  return await HrmTimeTrackingOwnerSessionTransformer.transform(session);
}
