import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { IRedditCommunityFileOfCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfCommunity";
import { IRedditCommunityFileOfUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileOfUser";
import { IRedditCommunityFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileThumbnail";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityFileCollector } from "../collectors/RedditCommunityFileCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityFileTransformer } from "../transformers/RedditCommunityFileTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityMemberFiles(props: {
  member: MemberPayload;
  body: IRedditCommunityFile.ICreate;
}): Promise<IRedditCommunityFile> {
  const { member, body } = props;
  // Validate file type enum
  const fileType: "avatar" | "post" | "community_icon" = typia.assert<
    "avatar" | "post" | "community_icon"
  >(body.file_type);
  // Validate owner_id is a valid UUID
  const ownerId: string & tags.Format<"uuid"> = typia.assert<
    string & tags.Format<"uuid">
  >(body.owner_id);
  // Create file record using collector
  const created = await MyGlobal.prisma.reddit_community_files.create({
    data: await RedditCommunityFileCollector.collect({
      body: {
        file_type: fileType,
        owner_id: ownerId,
        file_uri: body.file_uri,
      },
      redditCommunityMembers: {} as any,
      redditCommunityMemberSessions: {} as any,
    }),
    ...RedditCommunityFileTransformer.select(),
  });
  // Transform and return
  return await RedditCommunityFileTransformer.transform(created);
}
