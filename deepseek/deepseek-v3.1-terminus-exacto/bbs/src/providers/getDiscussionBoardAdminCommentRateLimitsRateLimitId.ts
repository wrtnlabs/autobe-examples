import { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardCommentRateLimitTransformer } from "../transformers/DiscussionBoardCommentRateLimitTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminCommentRateLimitsRateLimitId(props: {
  admin: AdminPayload;
  rateLimitId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardCommentRateLimit> {
  const rateLimit =
    await MyGlobal.prisma.discussion_board_comment_rate_limits.findUniqueOrThrow(
      {
        where: { id: props.rateLimitId },
        ...DiscussionBoardCommentRateLimitTransformer.select(),
      },
    );
  return await DiscussionBoardCommentRateLimitTransformer.transform(rateLimit);
}
