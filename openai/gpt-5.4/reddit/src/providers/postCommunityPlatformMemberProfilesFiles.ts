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
import { CommunityPlatformProfileFileCollector } from "../collectors/CommunityPlatformProfileFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformProfileFileTransformer } from "../transformers/CommunityPlatformProfileFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberProfilesFiles(props: {
  member: MemberPayload;
  body: ICommunityPlatformProfileFile.ICreate;
}): Promise<ICommunityPlatformProfileFile> {
  if (props.body.category !== "avatar") {
    throw new HttpException("Unsupported profile file category", 400);
  }
  const profile =
    await MyGlobal.prisma.community_platform_profiles.findFirstOrThrow({
      where: {
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const created = await MyGlobal.prisma.community_platform_profile_files.create(
    {
      data: await CommunityPlatformProfileFileCollector.collect({
        body: props.body,
        profile,
      }),
      ...CommunityPlatformProfileFileTransformer.select(),
    },
  );
  return await CommunityPlatformProfileFileTransformer.transform(created);
}
