import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditReportCollector } from "../collectors/RedditReportCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditReportTransformer } from "../transformers/RedditReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditReport.ICreate;
}): Promise<IRedditReport> {
  const created = await MyGlobal.prisma.reddit_reports.create({
    data: await RedditReportCollector.collect({
      body: props.body,
      redditMembers: { id: props.member.id },
    }),
    ...RedditReportTransformer.select(),
  });
  return await RedditReportTransformer.transform(created);
}
