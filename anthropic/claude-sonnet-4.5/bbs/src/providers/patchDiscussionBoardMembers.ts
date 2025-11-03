import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardMembers(props: {
  body: IDiscussionBoardMember.IRequest;
}): Promise<IPageIDiscussionBoardMember.ISummary> {
  const { body } = props;

  // Normalize pagination with defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<10> &
    tags.Maximum<100> as number;
  const skip = (page - 1) * limit;

  // Build search conditions for trigram matching on username, display_name, bio
  const searchConditions =
    body.search !== undefined && body.search !== null && body.search.length >= 2
      ? {
          OR: [
            { username: { contains: body.search } },
            { display_name: { contains: body.search } },
            { bio: { contains: body.search } },
          ],
        }
      : {};

  // Build date range filter
  const dateRangeFilter =
    (body.created_after !== undefined && body.created_after !== null) ||
    (body.created_before !== undefined && body.created_before !== null)
      ? {
          created_at: {
            ...(body.created_after !== undefined &&
              body.created_after !== null && {
                gte: body.created_after,
              }),
            ...(body.created_before !== undefined &&
              body.created_before !== null && {
                lte: body.created_before,
              }),
          },
        }
      : {};

  // Execute parallel count and findMany queries
  const [members, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_members.findMany({
      where: {
        ...searchConditions,
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(body.profile_visibility !== undefined &&
          body.profile_visibility !== null && {
            profile_visibility: body.profile_visibility,
          }),
        ...dateRangeFilter,
      },
      orderBy:
        body.sort_by === "username"
          ? { username: body.sort_order === "asc" ? "asc" : "desc" }
          : body.sort_by === "display_name"
            ? { display_name: body.sort_order === "asc" ? "asc" : "desc" }
            : body.sort_by === "last_login_at"
              ? { last_login_at: body.sort_order === "asc" ? "asc" : "desc" }
              : { created_at: body.sort_order === "asc" ? "asc" : "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        display_name: true,
        profile_picture_url: true,
      },
    }),
    MyGlobal.prisma.discussion_board_members.count({
      where: {
        ...searchConditions,
        ...(body.status !== undefined &&
          body.status !== null && {
            status: body.status,
          }),
        ...(body.profile_visibility !== undefined &&
          body.profile_visibility !== null && {
            profile_visibility: body.profile_visibility,
          }),
        ...dateRangeFilter,
      },
    }),
  ]);

  // Calculate total pages
  const pages = Math.ceil(total / limit);

  // Map to ISummary format with proper null to undefined conversion
  const data = members.map((member) => ({
    id: member.id satisfies string as string & tags.Format<"uuid">,
    username: member.username,
    display_name: member.display_name ?? undefined,
    profile_picture_url: member.profile_picture_url
      ? (member.profile_picture_url satisfies string as string &
          tags.Format<"uri">)
      : undefined,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
