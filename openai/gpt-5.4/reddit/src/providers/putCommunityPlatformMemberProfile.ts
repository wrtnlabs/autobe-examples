import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformProfileTransformer } from "../transformers/CommunityPlatformProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberProfile(props: {
  member: MemberPayload;
  body: ICommunityPlatformProfile.IUpdate;
}): Promise<ICommunityPlatformProfile> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const member = await tx.community_platform_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
      },
      select: {
        id: true,
        deleted_at: true,
      },
    });
    if (member.deleted_at !== null) {
      throw new HttpException("Member not found", 404);
    }
    const profile = await tx.community_platform_profiles.findFirstOrThrow({
      where: {
        community_platform_member_id: props.member.id,
      },
      select: {
        id: true,
        display_name: true,
        bio: true,
        deleted_at: true,
        files: {
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
            category: true,
            original_name: true,
            extension: true,
            mime_type: true,
            size: true,
            url: true,
            deleted_at: true,
            created_at: true,
          },
          orderBy: {
            created_at: "desc",
          },
        } satisfies Prisma.community_platform_profile_filesFindManyArgs,
      },
    });
    if (profile.deleted_at !== null) {
      throw new HttpException("Profile not found", 404);
    }
    const shouldUpdateDisplayName =
      props.body.display_name !== undefined &&
      props.body.display_name !== profile.display_name;
    const shouldUpdateBio =
      props.body.bio !== undefined && props.body.bio !== profile.bio;
    if (shouldUpdateDisplayName === true || shouldUpdateBio === true) {
      await tx.community_platform_profiles.update({
        where: {
          id: profile.id,
        },
        data: {
          ...(shouldUpdateDisplayName === true
            ? { display_name: props.body.display_name }
            : {}),
          ...(shouldUpdateBio === true ? { bio: props.body.bio } : {}),
          updated_at: new Date(),
        },
      });
    }
    if (props.body.avatar !== undefined) {
      const activeAvatar =
        props.body.avatar.category !== undefined
          ? (profile.files.find(
              (file) => file.category === props.body.avatar?.category,
            ) ?? profile.files[0])
          : profile.files[0];
      if (activeAvatar !== undefined) {
        const shouldUpdateAvatar =
          (props.body.avatar.category !== undefined &&
            props.body.avatar.category !== activeAvatar.category) ||
          (props.body.avatar.original_name !== undefined &&
            props.body.avatar.original_name !== activeAvatar.original_name) ||
          (props.body.avatar.extension !== undefined &&
            props.body.avatar.extension !== activeAvatar.extension) ||
          (props.body.avatar.mime_type !== undefined &&
            props.body.avatar.mime_type !== activeAvatar.mime_type) ||
          (props.body.avatar.size !== undefined &&
            props.body.avatar.size !== activeAvatar.size) ||
          (props.body.avatar.url !== undefined &&
            props.body.avatar.url !== activeAvatar.url);
        if (shouldUpdateAvatar === true) {
          await tx.community_platform_profile_files.update({
            where: {
              id: activeAvatar.id,
            },
            data: {
              ...(props.body.avatar.category !== undefined
                ? { category: props.body.avatar.category }
                : {}),
              ...(props.body.avatar.original_name !== undefined
                ? { original_name: props.body.avatar.original_name }
                : {}),
              ...(props.body.avatar.extension !== undefined
                ? { extension: props.body.avatar.extension }
                : {}),
              ...(props.body.avatar.mime_type !== undefined
                ? { mime_type: props.body.avatar.mime_type }
                : {}),
              ...(props.body.avatar.size !== undefined
                ? { size: props.body.avatar.size }
                : {}),
              ...(props.body.avatar.url !== undefined
                ? { url: props.body.avatar.url }
                : {}),
              updated_at: new Date(),
            },
          });
        }
      } else {
        await tx.community_platform_profile_files.create({
          data: {
            id: v4(),
            profile: {
              connect: {
                id: profile.id,
              },
            },
            category: props.body.avatar.category ?? "avatar",
            original_name: props.body.avatar.original_name ?? "avatar",
            extension: props.body.avatar.extension ?? "bin",
            mime_type:
              props.body.avatar.mime_type ?? "application/octet-stream",
            size: props.body.avatar.size ?? 0,
            url: props.body.avatar.url ?? "",
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    }
    const refreshed = await tx.community_platform_profiles.findUniqueOrThrow({
      where: {
        id: profile.id,
      },
      ...CommunityPlatformProfileTransformer.select(),
    });
    return await CommunityPlatformProfileTransformer.transform(refreshed);
  });
}
