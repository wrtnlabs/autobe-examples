import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneUserProfileTransformer } from "../transformers/RedditCloneUserProfileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberProfile(props: {
  member: MemberPayload;
  body: IRedditCloneUserProfile.IUpdate;
}): Promise<IRedditCloneUserProfile> {
  // Validate avatar file association if provided
  if (
    props.body.avatarFileId !== undefined &&
    props.body.avatarFileId !== null
  ) {
    const fileAssociation =
      await MyGlobal.prisma.reddit_clone_file_associations.findFirst({
        where: {
          id: props.body.avatarFileId,
          target_id: props.member.id,
          target_type: "user",
        },
      });
    if (!fileAssociation) {
      throw new HttpException("Invalid avatar file", 400);
    }
  }
  // Check if profile exists for the authenticated member
  const existingProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUnique({
      where: { reddit_clone_member_id: props.member.id },
    });
  let updated;
  if (existingProfile) {
    // Update existing profile
    updated = await MyGlobal.prisma.reddit_clone_user_profiles.update({
      where: { reddit_clone_member_id: props.member.id },
      data: {
        display_name: props.body.displayName,
        bio: props.body.bio === "" ? null : (props.body.bio ?? undefined),
        reddit_clone_file_association_id: props.body.avatarFileId ?? undefined,
        updated_at: new Date(),
      },
      ...RedditCloneUserProfileTransformer.select(),
    });
  } else {
    // Create new profile (edge case: profile not found)
    const created = await MyGlobal.prisma.reddit_clone_user_profiles.create({
      data: {
        id: v4(),
        reddit_clone_member_id: props.member.id,
        display_name: props.body.displayName,
        bio: props.body.bio === "" ? null : (props.body.bio ?? null),
        reddit_clone_file_association_id: props.body.avatarFileId ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      },
      ...RedditCloneUserProfileTransformer.select(),
    });
    updated = created;
  }
  return await RedditCloneUserProfileTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberProfile(props: {
//   member: MemberPayload;
//   body: IRedditCloneUserProfile.IUpdate;
// }): Promise<IRedditCloneUserProfile> {
//   await MyGlobal.prisma.reddit_clone_user_profiles.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCloneUserProfileTransformer.select(),
//   });
//   return await RedditCloneUserProfileTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------