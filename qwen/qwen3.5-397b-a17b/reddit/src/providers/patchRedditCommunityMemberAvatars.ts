import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityUserAvatar";
import { IRedditCommunityUserAvatar } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserAvatar";
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

export async function patchRedditCommunityMemberAvatars(props: {
  member: MemberPayload;
  body: IRedditCommunityUserAvatar.IRequest;
}): Promise<IPageIRedditCommunityUserAvatar.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    profile: {
      reddit_community_member_id: props.member.id,
      deleted_at: null,
    },
    ...(props.body.from_date && {
      created_at: {
        gte: new Date(props.body.from_date),
      },
    }),
    ...(props.body.to_date && {
      created_at: {
        lte: new Date(props.body.to_date),
      },
    }),
  } satisfies Prisma.reddit_community_user_avatarsWhereInput;
  const data = await MyGlobal.prisma.reddit_community_user_avatars.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      file_name: true,
      file_size: true,
      mime_type: true,
      storage_path: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_community_user_avatars.count({
    where: whereInput,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const avatarData: IRedditCommunityUserAvatar.ISummary[] = data.map(
    (avatar) => ({
      id: avatar.id,
      fileName: avatar.file_name,
      fileSize: avatar.file_size,
      mimeType: avatar.mime_type,
      storagePath: avatar.storage_path,
      createdAt: avatar.created_at.toISOString(),
    }),
  );
  return {
    pagination,
    data: avatarData,
  };
}
