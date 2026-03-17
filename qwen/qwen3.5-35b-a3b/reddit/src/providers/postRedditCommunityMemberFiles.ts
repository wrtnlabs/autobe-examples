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
  const fileId: string & tags.Format<"uuid"> = v4();
  const created: Prisma.reddit_community_filesGetPayload<
    ReturnType<typeof RedditCommunityFileTransformer.select>
  > = await MyGlobal.prisma.reddit_community_files.create({
    data: await RedditCommunityFileCollector.collect({
      body: props.body,
      owner_id: props.member.id,
    }),
    ...RedditCommunityFileTransformer.select(),
  });
  return await RedditCommunityFileTransformer.transform(created);
}
