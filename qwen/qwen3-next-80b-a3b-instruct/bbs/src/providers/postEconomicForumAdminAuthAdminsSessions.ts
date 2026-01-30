import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postEconomicForumAdminAuthAdminsSessions(props: {
  admin: AdminPayload;
}): Promise<void> {
  await MyGlobal.prisma.economic_forum_system_audits.create({
    data: {
      id: v4(),
      actor_type: "admin",
      target_type: "",
      target_id: "",
      reason: "",
      admin_id: props.admin.id,
      action: "session_create",
      created_at: toISOStringSafe(new Date()),
    },
  });
}
