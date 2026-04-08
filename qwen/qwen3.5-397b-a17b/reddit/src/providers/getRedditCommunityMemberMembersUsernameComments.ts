import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityCommentAtSummaryTransformer } from "../transformers/RedditCommunityCommentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberMembersUsernameComments(props: {
  member: MemberPayload;
  username: string;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const memberRecord = await MyGlobal.prisma.reddit_community_members.findFirst(
    {
      where: {
        username: props.username,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (!memberRecord) {
    throw new HttpException("Member not found", 404);
  }
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const records = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: {
      reddit_community_member_id: memberRecord.id,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...RedditCommunityCommentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: {
      reddit_community_member_id: memberRecord.id,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityCommentAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityComment.ISummary;
}
