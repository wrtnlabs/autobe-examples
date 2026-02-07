import { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminBansAppeals(props: {
  admin: AdminPayload;
  body: IDiscussionBoardBansAppeal.ICreate;
}): Promise<IDiscussionBoardBansAppeal> {
  return {
    id: v4() as string & tags.Format<"uuid">,
    ban_record_id: "00000000-0000-0000-0000-000000000000",
    user_id: "00000000-0000-0000-0000-000000000000",
    reviewed_by_id: null,
    appeal_reason: "",
    status: "pending",
    review_notes: null,
    appeal_created_at: new Date().toISOString(),
    reviewed_at: null,
  };
}
