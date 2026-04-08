import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneMemberTransformer } from "../transformers/RedditCloneMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMembers(props: {
  body: IRedditCloneMember.IUpdate;
}): Promise<IRedditCloneMember> {
  const authHeader = process.env.AUTHORIZATION ?? process.env.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpException("Unauthorized", 401);
  }
  const token = authHeader.slice(7);
  const decoded = jwt.verify(token, MyGlobal.env.JWT_SECRET_KEY) as {
    memberId?: string;
    sub?: string;
  };
  const memberId = (decoded.memberId ?? decoded.sub) as string &
    tags.Format<"uuid">;
  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { id: memberId, deleted_at: null },
    select: { id: true },
  });
  if (!member) {
    throw new HttpException("Unauthorized", 401);
  }
  if (props.body.avatarFileAssociationId !== undefined) {
    const fileAssociation =
      await MyGlobal.prisma.reddit_clone_file_associations.findUnique({
        where: { id: props.body.avatarFileAssociationId },
        select: { id: true, target_type: true, target_id: true },
      });
    if (!fileAssociation) {
      throw new HttpException("Avatar file not found", 404);
    }
    if (
      fileAssociation.target_type !== "user" ||
      fileAssociation.target_id !== memberId
    ) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const updateData: Prisma.reddit_clone_user_profilesUpdateInput = {
      updated_at: new Date(),
    };
    if (props.body.displayName !== undefined) {
      updateData.display_name = props.body.displayName;
    }
    if (props.body.bio !== undefined) {
      updateData.bio = props.body.bio;
    }
    if (props.body.avatarFileAssociationId !== undefined) {
      updateData.avatarFileAssociation = {
        connect: { id: props.body.avatarFileAssociationId },
      };
    }
    await tx.reddit_clone_user_profiles.update({
      where: { reddit_clone_member_id: memberId },
      data: updateData,
    });
    return await tx.reddit_clone_members.findFirstOrThrow({
      where: { id: memberId },
      ...RedditCloneMemberTransformer.select(),
    });
  });
  return await RedditCloneMemberTransformer.transform(record);
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
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMembers(props: {
//   body: IRedditCloneMember.IUpdate;
// }): Promise<IRedditCloneMember> {
//   const record = await MyGlobal.prisma.reddit_clone_members.findFirstOrThrow({
//     ...RedditCloneMemberTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------