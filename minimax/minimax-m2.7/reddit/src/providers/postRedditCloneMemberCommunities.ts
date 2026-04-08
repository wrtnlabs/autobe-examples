import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneCommunityCollector } from "../collectors/RedditCloneCommunityCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditCloneCommunity.ICreate;
}): Promise<IRedditCloneCommunity> {
  // Check if community name is already taken
  const existing = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { name: props.body.name },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Community name already taken", 409);
  }
  // Create the community
  const created = await MyGlobal.prisma.reddit_clone_communities.create({
    data: await RedditCloneCommunityCollector.collect({
      body: props.body,
      redditCloneMembers: { id: props.member.id },
      redditCloneMemberSessions: { id: props.member.session_id },
    }),
  });
  // Create owner moderator record (self-assigned)
  await MyGlobal.prisma.reddit_clone_moderators.create({
    data: {
      id: v4(),
      reddit_clone_member_id: props.member.id,
      reddit_clone_community_id: created.id,
      assigned_by: props.member.id,
      role: "owner",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Create file association if icon is provided
  if (props.body.icon !== undefined) {
    await MyGlobal.prisma.reddit_clone_file_associations.create({
      data: {
        id: v4(),
        target_type: "community",
        target_id: created.id,
        reddit_clone_file_id: props.body.icon.id,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Fetch and return the created community with full details
  const record =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: created.id },
      ...RedditCloneCommunityTransformer.select(),
    });
  return await RedditCloneCommunityTransformer.transform(record);
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
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneMemberCommunities(props: {
//   member: MemberPayload;
//   body: IRedditCloneCommunity.ICreate;
// }): Promise<IRedditCloneCommunity> {
//   const record = await MyGlobal.prisma.reddit_clone_communities.create({
//     data: await RedditCloneCommunityCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...RedditCloneCommunityTransformer.select(),
//   });
//   return await RedditCloneCommunityTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------