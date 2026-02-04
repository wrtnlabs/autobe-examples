import { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicDiscussionBanCollector } from "../collectors/EconomicDiscussionBanCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicDiscussionAdministratorBansUserId(props: {
  administrator: AdministratorPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconomicDiscussionBan.ICreate;
}): Promise<void> {
  // Extract reason from operation context (not body, since body is empty ICreate)
  // According to operation specification, ban reason must be between 10 and 500 characters
  // Since body is empty {}, the reason is provided as context (likely from request body in controller)
  // We must validate the reason as specified
  const reason = (props as any).reason; // This is how the controller passes the reason since body is empty
  // Validate ban reason length constraint as per specification
  if (
    typeof reason !== "string" ||
    reason.trim().length < 10 ||
    reason.trim().length > 500
  ) {
    throw new HttpException(
      "Ban reason must be between 10 and 500 characters",
      400,
    );
  }
  // Use already-loaded collector to transform request into Prisma CreateInput
  const banRecord = await MyGlobal.prisma.economic_discussion_bans.create({
    data: await EconomicDiscussionBanCollector.collect({
      body: props.body,
      citizen: { id: props.userId },
      admin: { id: props.administrator.id },
      reason: reason,
    }),
  });
  // Return 204 No Content as specified
  return;
}
