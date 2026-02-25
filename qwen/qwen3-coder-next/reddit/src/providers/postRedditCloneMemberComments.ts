import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneContentCommentCollector } from "../collectors/RedditCloneContentCommentCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneContentCommentTransformer } from "../transformers/RedditCloneContentCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneMemberComments(props: {
  member: MemberPayload;
  body: IRedditCloneContentComment.ICreate;
}): Promise<IRedditCloneContentComment> {
  const created = await MyGlobal.prisma.reddit_clone_content_comments.create({
    data: await RedditCloneContentCommentCollector.collect({
      body: props.body,
      redditCloneMembers: props.member,
    }),
    ...RedditCloneContentCommentTransformer.select(),
  });
  return await RedditCloneContentCommentTransformer.transform(created);
}
