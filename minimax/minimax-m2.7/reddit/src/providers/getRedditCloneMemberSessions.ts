import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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

export async function getRedditCloneMemberSessions(props: {
  member: MemberPayload;
}): Promise<IPageIRedditCloneMemberSession.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const sessions = await MyGlobal.prisma.reddit_clone_member_sessions.findMany({
    where: { reddit_clone_member_id: props.member.id },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
      member: {
        select: {
          id: true,
          username: true,
          profile: {
            select: {
              id: true,
              display_name: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_clone_member_sessions.count({
    where: { reddit_clone_member_id: props.member.id },
  });
  return {
    data: sessions.map((session) => ({
      id: session.id as string & tags.Format<"uuid">,
      profile: {
        id: session.member!.profile!.id as string & tags.Format<"uuid">,
        display_name: session.member!.profile!.display_name as string,
      },
      username: session.member!.username as string,
      karma_count: 0,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: toISOStringSafe(session.expired_at),
      isCurrent: session.id === props.member.session_id,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
