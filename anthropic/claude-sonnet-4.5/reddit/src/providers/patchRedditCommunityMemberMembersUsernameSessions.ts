import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditCommunityMemberMembersUsernameSessions(props: {
  member: MemberPayload;
  username: string;
  body: IRedditCommunityMemberSession.IRequest;
}): Promise<IPageIRedditCommunityMemberSession.ISummary> {
  // First, retrieve the member to get their username for authorization check
  const member = await MyGlobal.prisma.reddit_community_members.findUnique({
    where: { id: props.member.id },
    select: { username: true },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Authorization Security: Verify username from JWT matches path parameter
  if (member.username !== props.username) {
    throw new HttpException(
      "You are not authorized to access sessions for this member",
      403,
    );
  }

  // Extract pagination and filtering parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";
  const includeExpired = props.body.include_expired ?? false;
  const search = props.body.search;

  // Execute parallel queries for data and total count with inline parameters
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_member_sessions.findMany({
      where: {
        reddit_community_member_id: props.member.id,
        ...(!includeExpired && { expired_at: null }),
        ...(search && {
          OR: [
            { ip: { contains: search } },
            { href: { contains: search } },
            { referrer: { contains: search } },
          ],
        }),
      },
      orderBy: {
        [sortBy]: order,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_community_member_sessions.count({
      where: {
        reddit_community_member_id: props.member.id,
        ...(!includeExpired && { expired_at: null }),
        ...(search && {
          OR: [
            { ip: { contains: search } },
            { href: { contains: search } },
            { referrer: { contains: search } },
          ],
        }),
      },
    }),
  ]);

  // Transform database records to API response format
  const data: IRedditCommunityMemberSession.ISummary[] = sessions.map(
    (session) => ({
      id: session.id,
      reddit_community_member_id: session.reddit_community_member_id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
    }),
  );

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page - 1,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data,
  };
}
