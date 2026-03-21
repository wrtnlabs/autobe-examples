import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
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
  // 1. Find the member's profile by member ID
  const profile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { reddit_clone_member_id: props.member.id },
      select: { id: true },
    });
  // 2. Handle avatar_file_uri validation if provided
  let reddit_clone_file_association_id: string | null | undefined = undefined;
  if (props.body.avatar_file_uri !== undefined) {
    if (props.body.avatar_file_uri === null) {
      // Clear avatar - set to null
      reddit_clone_file_association_id = null;
    } else {
      // Validate the file exists in reddit_clone_file_associations table by ID
      // The client sends the file association ID as a URI-like string
      const fileAssociation =
        await MyGlobal.prisma.reddit_clone_file_associations.findUnique({
          where: { id: props.body.avatar_file_uri as string },
          select: { id: true },
        });
      if (!fileAssociation) {
        throw new HttpException("Avatar file not found", 404);
      }
      reddit_clone_file_association_id = fileAssociation.id;
    }
  }
  // 3. Truncate display_name and bio to max lengths if exceeded
  const MAX_DISPLAY_NAME_LENGTH = 50;
  const MAX_BIO_LENGTH = 500;
  const display_name =
    props.body.display_name.length > MAX_DISPLAY_NAME_LENGTH
      ? props.body.display_name.substring(0, MAX_DISPLAY_NAME_LENGTH)
      : props.body.display_name;
  const bio =
    props.body.bio !== undefined
      ? props.body.bio === null
        ? null
        : props.body.bio.length > MAX_BIO_LENGTH
          ? props.body.bio.substring(0, MAX_BIO_LENGTH)
          : props.body.bio
      : undefined;
  // 4. Update the profile record
  await MyGlobal.prisma.reddit_clone_user_profiles.update({
    where: { id: profile.id },
    data: {
      display_name,
      bio,
      ...(reddit_clone_file_association_id !== undefined && {
        reddit_clone_file_association_id,
      }),
      updated_at: new Date(),
    },
  });
  // 5. Fetch updated profile with all relations for response
  const updatedProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: { id: profile.id },
      ...RedditCloneUserProfileTransformer.select(),
    });
  // 6. Return transformed profile
  return await RedditCloneUserProfileTransformer.transform(updatedProfile);
}
