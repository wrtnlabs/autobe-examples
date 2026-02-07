import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardContentFlagTransformer } from "../transformers/DiscussionBoardContentFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminContentFlagsFlagId(props: {
  superAdmin: SuperadminPayload;
  flagId: string & tags.Format<"uuid">;
  body: IDiscussionBoardContentFlag.IUpdate;
}): Promise<IDiscussionBoardContentFlag> {
  const flag = await MyGlobal.prisma.discussion_board_content_flags.findUnique({
    where: { id: props.flagId, deleted_at: null },
    ...DiscussionBoardContentFlagTransformer.select(),
  });
  if (!flag) {
    throw new HttpException("Content flag not found", 404);
  }
  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    pending: ["under_review", "resolved"],
    under_review: ["resolved", "dismissed"],
  };
  if (props.body.status !== flag.status) {
    if (!validTransitions[flag.status]?.includes(props.body.status)) {
      throw new HttpException(
        `Invalid status transition from ${flag.status} to ${props.body.status}`,
        400,
      );
    }
  }
  // Validate resolution_reason for resolved/dismissed status
  if (
    (props.body.status === "resolved" || props.body.status === "dismissed") &&
    !props.body.resolution_reason
  ) {
    throw new HttpException(
      "Resolution reason is required for resolved or dismissed status",
      400,
    );
  }
  // Validate administrator assignment
  if (props.body.reviewing_admin_id) {
    const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
      where: { id: props.body.reviewing_admin_id, deleted_at: null },
    });
    if (!admin) {
      throw new HttpException("Assigned administrator not found", 400);
    }
  }
  const updateData: Prisma.discussion_board_content_flagsUpdateInput = {
    status: props.body.status,
    resolution_reason: props.body.resolution_reason,
    reviewingAdmin: props.body.reviewing_admin_id
      ? { connect: { id: props.body.reviewing_admin_id } }
      : undefined,
    updated_at: toISOStringSafe(new Date()),
  };
  // Set resolved_at timestamp if status becomes resolved/dismissed
  if (
    (props.body.status === "resolved" || props.body.status === "dismissed") &&
    flag.status !== props.body.status
  ) {
    updateData.resolved_at = toISOStringSafe(new Date());
  }
  const updated = await MyGlobal.prisma.discussion_board_content_flags.update({
    where: { id: props.flagId },
    data: updateData,
    ...DiscussionBoardContentFlagTransformer.select(),
  });
  return await DiscussionBoardContentFlagTransformer.transform(updated);
}
