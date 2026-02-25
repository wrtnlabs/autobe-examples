import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditMemberEmailVerification";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IRedditMemberEmailVerification.IRequest;
}): Promise<IPageIRedditMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const data = [] as Array<{
    id: string;
    token: string;
    expires_at: Date;
    created_at: Date;
    deleted_at: Date | null;
    member: {
      id: string;
      email: string;
      created_at: Date;
    };
  }>;
  const total = 0;
  return {
    data: data.map((item) => ({
      id: item.id,
      token: item.token,
      expires_at: toISOStringSafe(item.expires_at) as string &
        tags.Format<"date-time">,
      created_at: toISOStringSafe(item.created_at) as string &
        tags.Format<"date-time">,
      deleted_at: item.deleted_at
        ? (toISOStringSafe(item.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
      member: {
        id: item.member.id,
        email: item.member.email,
        created_at: toISOStringSafe(item.member.created_at) as string &
          tags.Format<"date-time">,
      },
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
