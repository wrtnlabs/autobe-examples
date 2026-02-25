import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSecurityEventTransformer } from "../transformers/DiscussionBoardSecurityEventTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSecurityEventsSecurityEventId(props: {
  admin: AdminPayload;
  securityEventId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSecurityEvent> {
  const securityEvent =
    await MyGlobal.prisma.discussion_board_security_events.findUniqueOrThrow({
      where: { id: props.securityEventId },
      ...DiscussionBoardSecurityEventTransformer.select(),
    });
  return await DiscussionBoardSecurityEventTransformer.transform(securityEvent);
}
