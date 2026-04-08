import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModeratorPasswordReset";
import { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { IRedditCloneModeratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorPasswordReset";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditCloneModeratorPasswordResetAtSummaryTransformer } from "../transformers/RedditCloneModeratorPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModeratorModeratorPasswordResets(props: {
  moderator: ModeratorPayload;
  body: IRedditCloneModeratorPasswordReset.IRequest;
}): Promise<IPageIRedditCloneModeratorPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_moderator_password_resetsWhereInput =
    {};
  if (props.body.moderator_id !== undefined) {
    whereInput.reddit_clone_moderator_id = props.body.moderator_id;
  }
  if (props.body.token !== undefined) {
    whereInput.token = {
      contains: props.body.token,
    };
  }
  if (props.body.status !== undefined) {
    const now = new Date();
    if (props.body.status === "active") {
      whereInput.expires_at = {
        gt: now,
      };
    } else if (props.body.status === "expired") {
      whereInput.expires_at = {
        lte: now,
      };
    }
  }
  if (props.body.created_at_from !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  }
  if (props.body.created_at_to !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_to),
    };
  }
  const orderByInput: Prisma.reddit_clone_moderator_password_resetsOrderByWithRelationInput =
    props.body.sort === "created_at asc"
      ? { created_at: "asc" as const }
      : props.body.sort === "created_at desc"
        ? { created_at: "desc" as const }
        : props.body.sort === "expires_at asc"
          ? { expires_at: "asc" as const }
          : props.body.sort === "expires_at desc"
            ? { expires_at: "desc" as const }
            : { created_at: "desc" as const };
  const data =
    await MyGlobal.prisma.reddit_clone_moderator_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneModeratorPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_clone_moderator_password_resets.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneModeratorPasswordResetAtSummaryTransformer.transform,
    ),
  };
}
