import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneMemberSessionTransformer } from "../transformers/RedditCloneMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

const SYSTEM_UUID = "00000000-0000-0000-0000-000000000000" as string &
  tags.Format<"uuid">;
export async function getRedditCloneMemberMembersSessions(props: {
  member: MemberPayload;
}): Promise<IPageIRedditCloneMemberSession> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  const whereCondition = {
    reddit_clone_member_id: props.member.id,
    expired_at: {
      gt: new Date(),
    },
    member: {
      deleted_at: null,
    },
  } satisfies Prisma.reddit_clone_member_sessionsWhereInput;
  const sessions = await MyGlobal.prisma.reddit_clone_member_sessions.findMany({
    where: whereCondition,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditCloneMemberSessionTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_member_sessions.count({
    where: whereCondition,
  });
  const data = await ArrayUtil.asyncMap(sessions, async (session) => {
    return await RedditCloneMemberSessionTransformer.transform(session);
  });
  return {
    data,
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit),
    },
  };
}
