import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityNameIcon(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityPlatformCommunity.IIconCreate;
}): Promise<ICommunityPlatformCommunity> {
  // 1. Find community by name (case-insensitive)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: {
          equals: props.communityName,
          mode: "insensitive",
        },
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify ownership
  if (community.owner_id !== props.member.id) {
    throw new HttpException("Only the community owner can upload an icon", 403);
  }
  // 3. Find existing icon file and soft-delete if exists
  const existingIconFile =
    await MyGlobal.prisma.community_platform_files.findUnique({
      where: {
        community_id: community.id,
      },
    });
  const now = new Date();
  if (existingIconFile !== null) {
    await MyGlobal.prisma.community_platform_files.update({
      where: {
        id: existingIconFile.id,
      },
      data: {
        deleted_at: now,
      },
    });
  }
  // 4. Create new file record for the icon
  const fileId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  await MyGlobal.prisma.community_platform_files.create({
    data: {
      id: fileId,
      community: {
        connect: {
          id: community.id,
        },
      },
      original_name: "community_icon",
      storage_path: props.body.imageUrl,
      mime_type: "image/jpeg",
      file_size: 0,
      width: 256,
      height: 256,
      file_type: "icon",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    } satisfies Prisma.community_platform_filesCreateInput,
  });
  // 5. Create file versions for display contexts in parallel
  await Promise.all(
    ["thumbnail", "medium", "large", "original"].map((versionType) =>
      MyGlobal.prisma.community_platform_file_versions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          file: {
            connect: {
              id: fileId,
            },
          },
          version_type: versionType,
          path: props.body.imageUrl,
          width: 256,
          height: 256,
          file_size: 0,
          created_at: now,
        } satisfies Prisma.community_platform_file_versionsCreateInput,
      }),
    ),
  );
  // 6. Update community icon URL
  await MyGlobal.prisma.community_platform_communities.update({
    where: {
      id: community.id,
    },
    data: {
      icon: props.body.imageUrl,
      updated_at: now,
    },
  });
  // 7. Fetch and return updated community using transformer
  const updatedCommunity =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: community.id,
      },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(
    updatedCommunity,
  );
}
