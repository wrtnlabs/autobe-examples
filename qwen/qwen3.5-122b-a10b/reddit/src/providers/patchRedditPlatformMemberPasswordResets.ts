import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformMemberPasswordResetTransformer } from "../transformers/RedditPlatformMemberPasswordResetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditPlatformMemberPasswordReset.IRequest;
}): Promise<IPageIRedditPlatformMemberPasswordReset> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_member_password_resetsWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      member: {
        email: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    }),
    ...(props.body.created_at_from && {
      created_at: {
        gte: props.body.created_at_from,
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: props.body.created_at_to,
      },
    }),
    ...(props.body.expires_at_from && {
      expires_at: {
        gte: props.body.expires_at_from,
      },
    }),
    ...(props.body.expires_at_to && {
      expires_at: {
        lte: props.body.expires_at_to,
      },
    }),
    ...(props.body.status &&
      props.body.status === "active" && {
        expires_at: {
          gte: new Date().toISOString() as string & tags.Format<"date-time">,
        },
      }),
    ...(props.body.status &&
      props.body.status === "expired" && {
        expires_at: {
          lt: new Date().toISOString() as string & tags.Format<"date-time">,
        },
      }),
    ...(props.body.status &&
      props.body.status === "consumed" && {
        deleted_at: {
          not: null,
        },
      }),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...RedditPlatformMemberPasswordResetTransformer.select(),
    }),
    MyGlobal.prisma.reddit_platform_member_password_resets.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await Promise.all(
      data.map((record) =>
        RedditPlatformMemberPasswordResetTransformer.transform(record),
      ),
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
