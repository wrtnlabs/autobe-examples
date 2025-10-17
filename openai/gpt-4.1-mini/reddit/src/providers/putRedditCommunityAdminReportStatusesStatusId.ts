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

export async function putRedditCommunityAdminReportStatusesStatusId(props: {
  admin: AdminPayload;
  statusId: string & tags.Format<"uuid">;
  body: IRedditCommunityReportStatus.IUpdate;
}): Promise<IRedditCommunityReportStatus> {
  const { statusId, body } = props;
  try {
    const updated =
      await MyGlobal.prisma.reddit_community_report_statuses.update({
        where: { id: statusId },
        data: {
          name: body.name,
          description:
            body.description === null ? null : (body.description ?? undefined),
          updated_at: toISOStringSafe(new Date()),
        },
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });

    return {
      id: updated.id,
      name: updated.name,
      description:
        updated.description === undefined ? null : updated.description,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  } catch (error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      (error.meta?.target as string[] | undefined)?.includes("name")
    ) {
      throw new HttpException(
        "Conflict: Report status name must be unique",
        409,
      );
    }
    throw error;
  }
}
