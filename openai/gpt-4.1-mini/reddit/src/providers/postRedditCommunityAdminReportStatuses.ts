import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postRedditCommunityAdminReportStatuses(props: {
  admin: AdminPayload;
  body: IRedditCommunityReportStatus.ICreate;
}): Promise<IRedditCommunityReportStatus> {
  const { body } = props;

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_report_statuses.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    name: created.name,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
