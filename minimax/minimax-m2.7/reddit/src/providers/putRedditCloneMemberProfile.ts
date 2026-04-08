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
  // Find existing profile for the member
  const existingProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findFirst({
      where: {
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  // Validate avatar file if provided
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
        select: {
          id: true,
        },
      });
    if (!fileAssociation) {
      throw new HttpException(
        "Avatar file not found or does not belong to you",
        400,
      );
    }
  }
  // Generate new UUID for profile creation
  const newProfileId: string & tags.Format<"uuid"> = v4();
  // Prepare data - truncate displayName to max 100 chars
  const displayNameValue: string & tags.MaxLength<100> =
    props.body.displayName.length > 100
      ? props.body.displayName.substring(0, 100)
      : props.body.displayName;
  // Handle bio: empty string becomes null, truncate to 500 chars
  const bioValue: string | null =
    props.body.bio == null
      ? null
      : props.body.bio === ""
        ? null
        : props.body.bio.length > 500
          ? props.body.bio.substring(0, 500)
          : props.body.bio;
  // Avatar file ID handling
  const avatarFileIdValue: string | null =
    props.body.avatarFileId == null ? null : props.body.avatarFileId;
  if (existingProfile) {
    // Update existing profile
    await MyGlobal.prisma.reddit_clone_user_profiles.update({
      where: { id: existingProfile.id },
      data: {
        display_name: displayNameValue,
        bio: bioValue,
        reddit_clone_file_association_id: avatarFileIdValue,
        updated_at: new Date(),
      },
    });
  } else {
    // Create new profile
    await MyGlobal.prisma.reddit_clone_user_profiles.create({
      data: {
        id: newProfileId,
        reddit_clone_member_id: props.member.id,
        display_name: displayNameValue,
        bio: bioValue,
        reddit_clone_file_association_id: avatarFileIdValue,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Fetch and return the updated profile
  const profileId = existingProfile ? existingProfile.id : newProfileId;
  const updated =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { id: profileId },
      ...RedditCloneUserProfileTransformer.select(),
    });
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