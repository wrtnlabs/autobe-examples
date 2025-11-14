import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumPostReport";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function postPoliticalForumCitizenPostsPostIdReports(props: {
  citizen: CitizenPayload;
  postId: string & tags.Format<"uuid">;
  body: IPoliticalForumPostReport.ICreate;
}): Promise<IPoliticalForumPostReport> {
  // Verify the target post exists and is not deleted
  const post = await MyGlobal.prisma.political_forum_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
  });

  if (!post) {
    throw new HttpException("Target post not found or has been deleted", 404);
  }

  // Check for existing report from this citizen on this post
  const existingReport =
    await MyGlobal.prisma.political_forum_post_reports.findFirst({
      where: {
        citizen: { id: props.citizen.id },
        post: { id: props.postId },
      },
    });

  if (existingReport) {
    throw new HttpException("You have already reported this post", 409);
  }

  // Create the new report and return its ID
  const createdReport =
    await MyGlobal.prisma.political_forum_post_reports.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        citizen: { connect: { id: props.citizen.id } },
        post: { connect: { id: props.postId } },
        reason: props.body,
        status: "pending",
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

  return typia.assert<IPoliticalForumPostReport>(createdReport);
}
