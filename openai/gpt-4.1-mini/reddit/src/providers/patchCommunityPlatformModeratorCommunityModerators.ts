import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunityModerators(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommunityModerator.IRequest;
}): Promise<IPageICommunityPlatformCommunityModerator.ISummary> {
  const pageNumber: number =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const pageLimit: number =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 100;
  const skipCount: number = (pageNumber - 1) * pageLimit;
  const username: string | undefined =
    typeof (props.body as any).username === "string"
      ? (props.body as any).username
      : undefined;
  const role: string | undefined =
    typeof (props.body as any).role === "string" &&
    ((props.body as any).role === "owner" ||
      (props.body as any).role === "moderator")
      ? (props.body as any).role
      : undefined;
  const whereCondition: Prisma.community_platform_community_moderatorsWhereInput =
    {
      deleted_at: null,
      ...(username ? { moderator_username: { contains: username } } : {}),
      ...(role ? { role } : {}),
    };
  // Select only properties that definitely exist
  const records =
    await MyGlobal.prisma.community_platform_community_moderators.findMany({
      where: whereCondition,
      skip: skipCount,
      take: pageLimit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        role: true,
        created_at: true,
        updated_at: true,
        community_id: true,
        community_moderator_id: true,
      },
    });
  const totalCount =
    await MyGlobal.prisma.community_platform_community_moderators.count({
      where: whereCondition,
    });
  function toUuidFormat(value: string): string & tags.Format<"uuid"> {
    return value;
  }
  function toDateTimeFormat(value: Date): string & tags.Format<"date-time"> {
    return toISOStringSafe(value);
  }
  const pageData: ICommunityPlatformCommunityModerator.ISummary[] = records.map(
    (record) => ({
      id: toUuidFormat(record.id),
      role: record.role,
      created_at: toDateTimeFormat(record.created_at),
      updated_at: toDateTimeFormat(record.updated_at),
      // moderator field omitted because unable to select moderator subfields
      community_id: toUuidFormat(record.community_id),
    }),
  );
  return {
    pagination: {
      current: pageNumber,
      limit: pageLimit,
      records: totalCount,
      pages: Math.ceil(totalCount / pageLimit),
    },
    data: pageData,
  };
}
