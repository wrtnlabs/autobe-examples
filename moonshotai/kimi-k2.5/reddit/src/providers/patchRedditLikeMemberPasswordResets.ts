import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMemberPasswordReset";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikeMemberPasswordResetAtSummaryTransformer } from "../transformers/RedditLikeMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditLikeMemberPasswordReset.IRequest;
}): Promise<IPageIRedditLikeMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_like_member_id: props.member.id,
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null &&
      props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null && {
        created_at: {
          gte: new Date(props.body.createdAtFrom),
          lte: new Date(props.body.createdAtTo),
        },
      }),
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null &&
      (props.body.createdAtTo === undefined ||
        props.body.createdAtTo === null) && {
        created_at: {
          gte: new Date(props.body.createdAtFrom),
        },
      }),
    ...(props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null &&
      (props.body.createdAtFrom === undefined ||
        props.body.createdAtFrom === null) && {
        created_at: {
          lte: new Date(props.body.createdAtTo),
        },
      }),
    ...(props.body.status === "PENDING" && {
      used_at: null,
      expires_at: {
        gt: new Date(),
      },
    }),
    ...(props.body.status === "USED" && {
      NOT: {
        used_at: null,
      },
    }),
    ...(props.body.status === "EXPIRED" && {
      used_at: null,
      expires_at: {
        lte: new Date(),
      },
    }),
  } satisfies Prisma.reddit_like_member_password_resetsWhereInput;
  const records =
    await MyGlobal.prisma.reddit_like_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...RedditLikeMemberPasswordResetAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_like_member_password_resets.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    RedditLikeMemberPasswordResetAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
