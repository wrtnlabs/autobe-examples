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
  const customer = (props as any).customer;
  if (!customer?.id) {
    throw new HttpException("Unauthorized", 401);
  }
  const memberId = customer.id;
  if (props.body.avatarFileAssociationId !== undefined) {
    const fileAssociation =
      await MyGlobal.prisma.reddit_clone_file_associations.findFirst({
        where: {
          id: props.body.avatarFileAssociationId,
          target_type: "user",
          target_id: memberId,
        },
        select: { id: true },
      });
    if (!fileAssociation) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.reddit_clone_members.findFirstOrThrow({
    where: { id: memberId, deleted_at: null },
  });
  const updateData: {
    display_name?: string;
    bio?: string | null;
    reddit_clone_file_association_id?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if (props.body.displayName !== undefined) {
    updateData.display_name = props.body.displayName;
  }
  if (props.body.bio !== undefined) {
    updateData.bio = props.body.bio;
  }
  if (props.body.avatarFileAssociationId !== undefined) {
    updateData.reddit_clone_file_association_id =
      props.body.avatarFileAssociationId;
  }
  await MyGlobal.prisma.reddit_clone_user_profiles.update({
    where: { reddit_clone_member_id: memberId },
    data: updateData,
  });
  const updatedMember =
    await MyGlobal.prisma.reddit_clone_members.findFirstOrThrow({
      where: { id: memberId },
      ...RedditCloneMemberTransformer.select(),
    });
  return await RedditCloneMemberTransformer.transform(updatedMember);
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